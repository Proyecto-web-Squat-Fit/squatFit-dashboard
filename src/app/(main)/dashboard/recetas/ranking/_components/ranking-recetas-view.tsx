"use client";

import { useMemo, useState } from "react";

import { AlertTriangle, CalendarRange, ChefHat, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { useRecipeRanking, useToggleFreeSample } from "@/hooks/use-recipe-ranking";
import { RecipeRankingUnavailableError, type RecipeRankingRow } from "@/lib/services/recetas-admin-service";

import { construirColumnasRanking } from "./columns.ranking-recetas";

/** «2026-07-01» → Date a medianoche LOCAL (evita el desfase de `new Date("2026-07-01")`, que es UTC). */
function fromDateInput(v: string): Date {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Presets del filtro de fechas: «de siempre» no manda from/to. */
type Preset = "todo" | "mes" | "30d" | "personalizado";

export function RankingRecetasView() {
  const [preset, setPreset] = useState<Preset>("todo");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [guardandoIds, setGuardandoIds] = useState<Set<string>>(new Set());

  const aplicarPreset = (p: Preset) => {
    setPreset(p);
    const hoy = new Date();
    if (p === "todo") {
      setFrom("");
      setTo("");
    } else if (p === "mes") {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      setFrom(toDateInputValue(inicio));
      setTo(toDateInputValue(hoy));
    } else if (p === "30d") {
      const inicio = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
      setFrom(toDateInputValue(inicio));
      setTo(toDateInputValue(hoy));
    }
  };

  // El backend filtra por `created_at >= from` / `<= to` (inclusive) sobre
  // fecha/hora ISO. `to` se manda como fin de ese día (23:59:59) para que
  // «hasta hoy» incluya los eventos de hoy mismo, no solo hasta medianoche.
  const params = useMemo(() => {
    const p: { from?: string; to?: string } = {};
    if (from) p.from = fromDateInput(from).toISOString();
    if (to) {
      const fin = fromDateInput(to);
      fin.setHours(23, 59, 59, 999);
      p.to = fin.toISOString();
    }
    return p;
  }, [from, to]);

  const ranking = useRecipeRanking(params);
  const toggleFreeSample = useToggleFreeSample();

  const rows = ranking.data ?? [];
  const sinDatosEnRango = rows.length > 0 && rows.every((r) => r.opens === 0 && r.clicks === 0);

  const columns = useMemo(
    () =>
      construirColumnasRanking({
        guardando: (id) => guardandoIds.has(id),
        onToggleFreeSample: (row, next) => {
          const verbo = next ? "marcar como gratuita" : "quitar de gratuitas";
          if (!confirm(`¿Seguro que quieres ${verbo} la receta «${row.recipe_name}»?`)) return;
          setGuardandoIds((s) => new Set(s).add(row.recipe_id));
          toggleFreeSample.mutate(
            { recipeId: row.recipe_id, nextValue: next },
            {
              onSuccess: () => {
                toast.success(
                  next ? `«${row.recipe_name}» ahora es gratuita` : `«${row.recipe_name}» ya no es gratuita`,
                );
              },
              onError: (e) => {
                toast.error(e instanceof Error ? e.message : "No se ha podido guardar el cambio");
              },
              onSettled: () => {
                setGuardandoIds((s) => {
                  const next = new Set(s);
                  next.delete(row.recipe_id);
                  return next;
                });
              },
            },
          );
        },
      }),
    [guardandoIds, toggleFreeSample],
  );

  const table = useDataTableInstance<RecipeRankingRow, unknown>({
    data: rows,
    columns,
    persistKey: "ranking-recetas",
    enableColumnResizing: true,
    getRowId: (r) => r.recipe_id,
    defaultPageSize: 20,
  });

  const noDisponible = ranking.error instanceof RecipeRankingUnavailableError;

  return (
    <div className="@container/main flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ChefHat className="size-6" /> Ranking de recetas
        </h1>
        <p className="text-muted-foreground text-sm">
          Aperturas, clics y tiempo de lectura por receta, para elegir las muestras gratuitas de «Mi cocina» con datos
          reales en vez de a mano.
        </p>
      </div>

      {/* Filtro de rango de fechas */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1.5">
          {(
            [
              { id: "todo", label: "Todo el histórico" },
              { id: "30d", label: "Últimos 30 días" },
              { id: "mes", label: "Este mes" },
            ] as const
          ).map((p) => (
            <Button
              key={p.id}
              type="button"
              variant={preset === p.id ? "default" : "outline"}
              size="sm"
              onClick={() => aplicarPreset(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="ranking-from" className="text-muted-foreground text-xs">
              Desde
            </Label>
            <Input
              id="ranking-from"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("personalizado");
              }}
              className="h-8 w-[150px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="ranking-to" className="text-muted-foreground text-xs">
              Hasta
            </Label>
            <Input
              id="ranking-to"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("personalizado");
              }}
              className="h-8 w-[150px]"
            />
          </div>
        </div>
        {ranking.isFetching && !ranking.isLoading && <Loader2 className="text-muted-foreground size-4 animate-spin" />}
      </div>

      {ranking.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : noDisponible ? (
        <Alert>
          <TriangleAlert className="size-4" />
          <AlertTitle>Esta función todavía no está disponible</AlertTitle>
          <AlertDescription>
            El ranking de recetas depende de un endpoint del backend (<code>admin-panel/recipes/ranking</code>, PR #90
            de SquatFit) que está abierto pero sin desplegar todavía. En cuanto se despliegue, esta pantalla empezará a
            mostrar datos solos, sin más cambios aquí.
          </AlertDescription>
        </Alert>
      ) : ranking.isError ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>No se ha podido cargar el ranking</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{ranking.error instanceof Error ? ranking.error.message : "Error desconocido"}</span>
            <Button variant="outline" size="sm" className="w-fit gap-2" onClick={() => ranking.refetch()}>
              <RefreshCw className="size-3.5" /> Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            Todavía no hay recetas activas.
          </CardContent>
        </Card>
      ) : (
        <>
          {sinDatosEnRango && (
            <Alert>
              <CalendarRange className="size-4" />
              <AlertTitle>Sin datos de uso en este rango de fechas</AlertTitle>
              <AlertDescription>
                Ninguna receta registró aperturas ni clics entre las fechas elegidas. Las cifras de abajo están a cero
                porque no hay eventos en el rango — no es que las recetas no gusten. Prueba con «Todo el histórico» o un
                rango más amplio.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex items-center justify-end">
            <DataTableViewOptions table={table} />
          </div>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="overflow-x-auto rounded-lg border">
                <DataTable table={table} columns={columns} enableColumnResize enableColumnReorder />
              </div>
              <DataTablePagination table={table} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
