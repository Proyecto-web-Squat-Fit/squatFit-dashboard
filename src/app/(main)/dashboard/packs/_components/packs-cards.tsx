"use client";

import { useMemo } from "react";

import { Package, DollarSign, Layers, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePacks } from "@/hooks/use-packs";

export function PacksCards() {
  const { data: packs = [], isLoading } = usePacks();

  const stats = useMemo(() => {
    const total = packs.length;
    const totalVersiones = packs.reduce((sum, p) => sum + (p.versionsCount ?? p.versions?.length ?? 0), 0);
    const precios = packs.map((p) => p.price).filter((n) => n > 0);
    const precioPromedio = precios.length > 0 ? precios.reduce((a, b) => a + b, 0) / precios.length : 0;
    const masEconomico = precios.length > 0 ? Math.min(...precios) : 0;

    return {
      total,
      totalVersiones,
      precioPromedio,
      masEconomico,
    };
  }, [packs]);

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
          <CardDescription>Total Packs</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{stats.total}</CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Package className="size-4" />
              Packs
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">Packs disponibles</div>
          <div className="text-muted-foreground">Combinaciones de versiones</div>
        </CardFooter>
      </Card>

      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Versiones en packs</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.totalVersiones}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-green">
              <Layers className="size-4" />
              Versiones
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">Total de versiones incluidas</div>
          <div className="text-muted-foreground">En todos los packs</div>
        </CardFooter>
      </Card>

      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Precio promedio</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            €{stats.precioPromedio.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-indigo">
              <DollarSign className="size-4" />
              Promedio
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">Precio medio por pack</div>
          <div className="text-muted-foreground">Valor promedio</div>
        </CardFooter>
      </Card>

      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Pack más económico</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            €{stats.masEconomico.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-orange">
              <TrendingDown className="size-4" />
              Mínimo
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 font-medium">Menor precio de pack</div>
          <div className="text-muted-foreground">Pack más barato</div>
        </CardFooter>
      </Card>
    </div>
  );
}
