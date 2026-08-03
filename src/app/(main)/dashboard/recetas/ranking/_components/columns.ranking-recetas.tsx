"use client";

import Link from "next/link";

import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, ExternalLink, Loader2, MousePointerClick, Timer } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MetaColumna } from "@/lib/formato-de-tablas";
import type { RecipeRankingRow } from "@/lib/services/recetas-admin-service";

/**
 * COLUMNAS DEL RANKING DE RECETAS (F5, 31-jul) — norma «formato de tablas».
 *
 * Solo «Receta» es obligatoria (identifica la fila, como «Título» en Libros).
 * No hay acciones de Editar/Eliminar aquí a propósito: esta tabla existe
 * para UNA cosa (elegir muestras gratuitas con datos), no para administrar
 * el contenido de la receta — eso ya lo hace /dashboard/recetas. El enlace
 * «Editar receta» lleva allí para lo demás.
 *
 * Umbral de «muestra pequeña» del tiempo medio de lectura.
 *
 * Desde el 3-ago el backend devuelve `read_time_events`: el número REAL de
 * lecturas que entraron en la media, o sea su denominador. Antes aquí se usaba
 * `opens` como aproximación —con su límite escrito— y ese proxy SOBREESTIMA:
 * se puede abrir una receta y cerrarla sin leerla, así que `opens` siempre es
 * mayor o igual que las lecturas reales y hacía parecer sólida una media que
 * no lo era.
 *
 * Se sigue tolerando que el campo no venga (un API anterior): en ese caso se
 * cae a `opens` y al texto de antes. Degradar es mejor que romper la pantalla.
 */
const UMBRAL_MUESTRA_PEQUEÑA = 2;

/** «1m 30s» o «45s». */
function formatearSegundos(s: number): string {
  if (s < 60) return `${s}s`;
  const min = Math.floor(s / 60);
  const rest = s % 60;
  return rest === 0 ? `${min}m` : `${min}m ${rest}s`;
}

export interface AccionesRanking {
  onToggleFreeSample: (row: RecipeRankingRow, next: boolean) => void;
  /** Fila con el guardado en vuelo (deshabilita el switch mientras tanto). */
  guardando: (recipeId: string) => boolean;
}

const META_OBLIGATORIA: MetaColumna["obligatoriaPara"] = ["adviser", "support", "trainer", "nutritionist"];

export function construirColumnasRanking(acciones: AccionesRanking): ColumnDef<RecipeRankingRow>[] {
  return [
    {
      accessorKey: "recipe_name",
      id: "receta",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Receta" />,
      meta: { label: "Receta", obligatoriaPara: META_OBLIGATORIA } satisfies MetaColumna,
      size: 260,
      cell: ({ row }) => {
        const r = row.original;
        const sinDatos = r.opens === 0 && r.clicks === 0;
        return (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{r.recipe_name}</span>
            {sinDatos && <span className="text-muted-foreground text-xs italic">Sin datos todavía</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "is_free_sample",
      id: "gratuita",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Gratuita" />,
      meta: { label: "Gratuita" } satisfies MetaColumna,
      size: 130,
      cell: ({ row }) => {
        const r = row.original;
        const enVuelo = acciones.guardando(r.recipe_id);
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={r.is_free_sample}
              disabled={enVuelo}
              onCheckedChange={(next) => acciones.onToggleFreeSample(r, next)}
              aria-label={
                r.is_free_sample ? `Quitar «${r.recipe_name}» de gratuitas` : `Marcar «${r.recipe_name}» como gratuita`
              }
            />
            {enVuelo && <Loader2 className="text-muted-foreground size-3.5 animate-spin" />}
          </div>
        );
      },
    },
    {
      accessorKey: "opens",
      id: "aperturas",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Aperturas" />,
      meta: { label: "Aperturas" } satisfies MetaColumna,
      size: 110,
      cell: ({ row }) => {
        const n = row.original.opens;
        return <span className={`tabular-nums ${n === 0 ? "text-muted-foreground" : "font-medium"}`}>{n}</span>;
      },
    },
    {
      accessorKey: "clicks",
      id: "clics",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Clics" />,
      meta: { label: "Clics" } satisfies MetaColumna,
      size: 100,
      cell: ({ row }) => {
        const n = row.original.clicks;
        return (
          <span className={`flex items-center gap-1 tabular-nums ${n === 0 ? "text-muted-foreground" : "font-medium"}`}>
            <MousePointerClick className="size-3.5 opacity-60" /> {n}
          </span>
        );
      },
    },
    {
      accessorKey: "avg_read_seconds",
      id: "lectura",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Lectura media" />,
      meta: { label: "Lectura media" } satisfies MetaColumna,
      size: 170,
      cell: ({ row }) => {
        const r = row.original;
        if (r.avg_read_seconds == null) {
          return <span className="text-muted-foreground text-sm">Sin datos</span>;
        }
        // Denominador real si el backend lo manda; si no, la aproximación vieja.
        const lecturas = r.read_time_events;
        const tieneDato = typeof lecturas === "number";
        const base = tieneDato ? lecturas : r.opens;
        const muestraPequeña = base <= UMBRAL_MUESTRA_PEQUEÑA;
        return (
          <div className="flex items-center gap-1.5">
            <Timer className="size-3.5 opacity-60" />
            <span className="tabular-nums">{formatearSegundos(r.avg_read_seconds)}</span>
            {tieneDato && (
              <span className="text-muted-foreground text-xs tabular-nums">
                ({lecturas} {lecturas === 1 ? "lectura" : "lecturas"})
              </span>
            )}
            {muestraPequeña && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="size-3.5 shrink-0 text-amber-600" />
                </TooltipTrigger>
                <TooltipContent>
                  {tieneDato
                    ? `Media calculada sobre ${base} ${base === 1 ? "lectura" : "lecturas"}: todavía no es fiable para decidir con ella.`
                    : `Basada en muy pocas aperturas (${base}): todavía no es una media fiable para decidir con ella.`}
                </TooltipContent>
              </Tooltip>
            )}
            {r.avg_read_seconds >= 900 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] font-normal">
                    tope
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  El servidor capa cada lectura a 900s (15 min): no es un error, es el límite del evento.
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      id: "acciones",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: 90,
      cell: () => (
        <Button asChild variant="ghost" size="icon" title="Editar receta">
          <Link href="/dashboard/recetas">
            <ExternalLink className="size-4" />
          </Link>
        </Button>
      ),
    },
  ];
}
