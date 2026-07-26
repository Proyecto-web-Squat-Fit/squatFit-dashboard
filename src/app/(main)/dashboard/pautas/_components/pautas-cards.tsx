"use client";

import { useMemo } from "react";

import { FileText, Users, TrendingUp, AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { usePautasStats } from "@/hooks/use-pautas";

import { getPautasStats } from "./data";

export function PautasCards() {
  // Obtener estadísticas del backend
  const { stats: backendStats, isLoading } = usePautasStats();
  // Usar datos mock como fallback
  const mockStats = useMemo(() => getPautasStats(), []);

  // Combinar datos del backend con datos mock
  const stats = useMemo(() => {
    if (isLoading) {
      return mockStats; // Mostrar datos mock mientras carga
    }

    // Combinar estadísticas del backend con datos mock
    // El backend solo provee promedioMacros y ultimasActualizaciones
    return {
      ...mockStats, // Mantener datos mock para campos no disponibles en backend
      promedioMacros: backendStats?.promedioMacros ?? mockStats.promedioMacros,
      ultimasActualizaciones: backendStats?.ultimasActualizaciones ?? mockStats.ultimasActualizaciones,
    };
  }, [backendStats, mockStats, isLoading]);

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Total Pautas */}
      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Total de Pautas</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? <Loader2 className="inline-block size-5 animate-spin" /> : stats.totalPautas}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-indigo">
              <FileText className="size-4" />
              Pautas
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <TrendingUp className="size-4" />
            {stats.ultimasActualizaciones} actualizadas esta semana
          </div>
          <div className="text-muted-foreground">Nutricionales y deportivas</div>
        </CardFooter>
      </Card>

      {/* Pautas Activas */}
      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Pautas Activas</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.pautasActivas}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-green">
              <CheckCircle2 className="size-4" />
              Activas
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">{stats.pautasCompletadas} completadas</div>
          <div className="text-muted-foreground">{stats.pautasBorrador} en borrador</div>
        </CardFooter>
      </Card>

      {/* Clientes sin Pauta */}
      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Clientes sin Pauta</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.clientesSinPauta}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-orange">
              <AlertCircle className="size-4" />
              Pendientes
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <Users className="size-4" />
            Requieren atención
          </div>
          <div className="text-muted-foreground">Clientes activos sin pauta asignada</div>
        </CardFooter>
      </Card>

      {/* Macros Promedio */}
      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Macros Promedio</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? (
              <Loader2 className="inline-block size-5 animate-spin" />
            ) : (
              `${stats.promedioMacros.calorias} kcal`
            )}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-wine">
              <Clock className="size-4" />
              Diario
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            P: {stats.promedioMacros.proteinas}g | C: {stats.promedioMacros.carbohidratos}g | G:{" "}
            {stats.promedioMacros.grasas}g
          </div>
          <div className="text-muted-foreground">Distribución media de todas las pautas</div>
        </CardFooter>
      </Card>
    </div>
  );
}
