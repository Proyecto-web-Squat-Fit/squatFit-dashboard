"use client";

import { useMemo } from "react";

import { BookOpen, Package, Layers, BookMarked } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLibros } from "@/hooks/use-libros";

export function LibrosCards() {
  const { data: libros = [], isLoading } = useLibros();

  // Calcular estadísticas dinámicamente (el precio pertenece a las versiones, no a los libros)
  const stats = useMemo(() => {
    const total = libros.length;
    const conVersiones = libros.filter((l) => l.versions && l.versions.length > 0).length;
    const sinVersiones = total - conVersiones;
    const totalVersiones = libros.reduce((sum, l) => sum + (l.versions?.length || 0), 0);

    return {
      total,
      conVersiones,
      sinVersiones,
      totalVersiones,
    };
  }, [libros]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="sqf-metric-card @container/card">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Libros Totales</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{stats.total}</CardTitle>
          <CardAction>
            <Badge variant="outline">
              <BookOpen className="size-4" />
              Total
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Catálogo completo de libros</div>
          <div className="text-muted-foreground">
            {stats.conVersiones} con versiones, {stats.totalVersiones} versiones en total
          </div>
        </CardFooter>
      </Card>

      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Libros con Versiones</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.conVersiones}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-green">
              <Layers className="size-4" />
              Con versiones
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Libros con ediciones disponibles</div>
          <div className="text-muted-foreground">{stats.totalVersiones} versiones en el catálogo</div>
        </CardFooter>
      </Card>

      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Total Versiones</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalVersiones}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-indigo">
              <Package className="size-4" />
              Versiones
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Ediciones en el catálogo</div>
          <div className="text-muted-foreground">Suma de todas las versiones de libros</div>
        </CardFooter>
      </Card>

      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Libros sin versiones</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.sinVersiones}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-orange">
              <BookMarked className="size-4" />
              Pendientes
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Libros aún sin ediciones publicadas</div>
          <div className="text-muted-foreground">No aparecen en el catálogo hasta tener versiones</div>
        </CardFooter>
      </Card>
    </div>
  );
}
