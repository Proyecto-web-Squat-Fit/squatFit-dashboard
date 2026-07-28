"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { Apple, ArrowLeftRight, ArrowRight, ChefHat, Clock, Flame, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlimentosAdminService, type AdminFood } from "@/lib/services/alimentos-admin-service";
import { RecetasAdminService, type AdminRecipe } from "@/lib/services/recetas-admin-service";

/**
 * LANDING DE NUTRI (reestructura 27-jul): Nutri deja de ser solo un
 * desplegable. Al clicar la sección se ve:
 * - lo añadido/editado recientemente (recetas reales vía el servicio de
 *   recetas del back office) con enlace directo,
 * - tarjetas de acceso a sus secciones,
 * - un buscador rápido sobre recetas y alimentos.
 */

const SECCIONES = [
  {
    id: "alimentos",
    title: "Lista de Alimentos",
    description: "Base de alimentos con macros, categorías y etiquetas.",
    href: "/dashboard/nutri/alimentos",
    icon: Apple,
  },
  {
    id: "recetas",
    title: "Banco de Recetas",
    description: "Recetas con ingredientes, preparación y macros por ración.",
    href: "/dashboard/recetas",
    icon: ChefHat,
  },
  {
    id: "sustituciones",
    title: "Sustituciones",
    description: "Equivalencias e intercambios entre alimentos y restricciones.",
    href: "/dashboard/nutri/sustituciones",
    icon: ArrowLeftRight,
  },
];

function fechaCorta(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export function NutriLanding() {
  const [recipes, setRecipes] = useState<AdminRecipe[] | null>(null);
  const [recipesError, setRecipesError] = useState(false);
  const [totalAlimentos, setTotalAlimentos] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [alimentosResultados, setAlimentosResultados] = useState<AdminFood[]>([]);

  useEffect(() => {
    let cancelled = false;
    RecetasAdminService.getRecipes()
      .then((r) => {
        if (!cancelled) setRecipes(r);
      })
      .catch(() => {
        if (!cancelled) {
          setRecipesError(true);
          setRecipes([]);
        }
      });
    AlimentosAdminService.getFoods({ limit: 1 })
      .then((r) => {
        if (!cancelled) setTotalAlimentos(r.total);
      })
      .catch(() => {
        if (!cancelled) setTotalAlimentos(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Recetas tocadas más recientemente (creadas o editadas).
  const recientes = useMemo(
    () => [...(recipes ?? [])].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "")).slice(0, 5),
    [recipes],
  );

  // Buscador rápido: recetas ya cargadas en memoria + alimentos vía API (33.647, no cabe en memoria).
  const q = search.trim();
  useEffect(() => {
    if (!q) {
      setAlimentosResultados([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      AlimentosAdminService.getFoods({ search: q, limit: 5 })
        .then((r) => {
          if (!cancelled) setAlimentosResultados(r.data);
        })
        .catch(() => {
          if (!cancelled) setAlimentosResultados([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const resultados = useMemo(() => {
    if (!q) return null;
    const qLower = q.toLowerCase();
    const recetas = (recipes ?? [])
      .filter((r) => r.name.toLowerCase().includes(qLower))
      .slice(0, 5)
      .map((r) => ({ tipo: "Receta", nombre: r.name, href: "/dashboard/recetas" }));
    const alimentos = alimentosResultados.map((a) => ({
      tipo: "Alimento",
      nombre: a.nombre,
      href: "/dashboard/nutri/alimentos",
    }));
    return [...recetas, ...alimentos];
  }, [q, recipes, alimentosResultados]);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Nutri</h1>
        <p className="text-muted-foreground text-sm">
          Todo lo de nutrición en un sitio: alimentos, recetas y sustituciones.
        </p>
      </div>

      {/* Buscador rápido */}
      <div className="relative max-w-md">
        <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
        <Input
          placeholder="Buscar recetas o alimentos…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
        {resultados && (
          <div className="bg-popover absolute z-10 mt-1 w-full rounded-md border p-1 shadow-md">
            {resultados.length === 0 && (
              <p className="text-muted-foreground px-2 py-1.5 text-sm">Sin resultados para «{search}»</p>
            )}
            {resultados.map((r) => (
              <Link
                key={`${r.tipo}-${r.nombre}`}
                href={r.href}
                className="hover:bg-accent flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm"
              >
                <span className="truncate">{r.nombre}</span>
                <Badge variant="outline" className="shrink-0 font-normal">
                  {r.tipo}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Tarjetas de acceso a las secciones */}
      <div className="grid gap-4 md:grid-cols-3">
        {SECCIONES.map((s) => (
          <Card key={s.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <s.icon className="size-5 text-[#FF690B]" />
                <CardTitle className="text-base">{s.title}</CardTitle>
              </div>
              <CardDescription>{s.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                {s.id === "alimentos" &&
                  (totalAlimentos === null ? "Cargando…" : `${totalAlimentos.toLocaleString("es-ES")} alimentos`)}
                {s.id === "recetas" &&
                  (recipes === null ? "Cargando…" : recipesError ? "—" : `${recipes.length} recetas`)}
                {s.id === "sustituciones" && "Equivalencias por categoría"}
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href={s.href}>
                  Abrir
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actividad reciente (recetas reales del servicio) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Añadido o editado recientemente</CardTitle>
          <CardDescription>Últimas recetas tocadas en el banco, con enlace directo.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {recipes === null && [1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
          {recipes !== null && recipesError && (
            <p className="text-muted-foreground text-sm">
              No se pudo cargar la actividad reciente (backend no disponible).
            </p>
          )}
          {recipes !== null && !recipesError && recientes.length === 0 && (
            <p className="text-muted-foreground text-sm">Aún no hay recetas en el banco.</p>
          )}
          {recientes.map((r) => (
            <Link
              key={r.id}
              href="/dashboard/recetas"
              className="hover:bg-accent flex items-center justify-between gap-3 rounded-md px-2 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <ChefHat className="text-muted-foreground size-4 shrink-0" />
                <span className="truncate text-sm font-medium">{r.name}</span>
              </span>
              <span className="text-muted-foreground flex shrink-0 items-center gap-3 text-xs">
                {r.duration_minutes != null && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {r.duration_minutes} min
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Flame className="size-3.5" />
                  {r.kcal} kcal
                </span>
                <span>{fechaCorta(r.updated_at)}</span>
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
