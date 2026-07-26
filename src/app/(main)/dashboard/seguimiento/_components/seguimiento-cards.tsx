"use client";

import { useMemo } from "react";

import { Users, CalendarCheck, AlertTriangle, ClipboardList, TrendingUp, UtensilsCrossed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useSeguimientoStats, useMeals, useIMCHistory } from "@/hooks/use-seguimiento";

import { getSeguimientoStats } from "./data";

export function SeguimientoCards() {
  const today = new Date().toISOString().split("T")[0];

  // Obtener datos reales del backend
  const { stats: seguimientoStats, isLoading: isLoadingStats } = useSeguimientoStats({ date: today });
  const { meals: mealsToday, isLoading: isLoadingMeals } = useMeals({ date: today, enabled: true });
  const { history: imcHistory, isLoading: isLoadingIMC } = useIMCHistory({ enabled: true });

  // Datos mock para estadísticas que no están disponibles en el backend
  const mockStats = useMemo(() => getSeguimientoStats(), []);

  // Combinar datos reales con datos mock
  const stats = useMemo(() => {
    const realStats = seguimientoStats || {
      totalMeals: 0,
      mealsThisWeek: 0,
      mealsToday: 0,
      imcRecords: 0,
      averageCalories: 0,
      formAnswersCount: 0,
    };

    return {
      ...mockStats,
      // Sobrescribir con datos reales cuando estén disponibles
      comidasHoy: realStats.mealsToday || mealsToday.length,
      comidasSemana: realStats.mealsThisWeek,
      registrosIMC: realStats.imcRecords || imcHistory.length,
      promedioCalorias: realStats.averageCalories,
    };
  }, [seguimientoStats, mealsToday, imcHistory, mockStats]);

  const isLoading = isLoadingStats || isLoadingMeals || isLoadingIMC;

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Clientes Activos */}
      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Clientes Activos</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.clientesActivos}/{stats.totalClientes}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-green">
              <Users className="size-4" />
              Activos
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            <TrendingUp className="size-4" />
            {stats.cumplimientoPromedio}% cumplimiento promedio
          </div>
          <div className="text-muted-foreground">
            {stats.clientesPendientePago > 0 && (
              <span className="text-amber-600">{stats.clientesPendientePago} con pago pendiente</span>
            )}
            {stats.clientesPendientePago === 0 && "Todos los pagos al día"}
          </div>
        </CardFooter>
      </Card>

      {/* Revisiones */}
      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Revisiones Programadas</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.revisionesSemana}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-indigo">
              <CalendarCheck className="size-4" />
              Esta semana
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.revisionesHoy > 0 ? (
              <span className="text-blue-600">{stats.revisionesHoy} revisión(es) hoy</span>
            ) : (
              "Sin revisiones hoy"
            )}
          </div>
          <div className="text-muted-foreground">Agenda de seguimiento semanal</div>
        </CardFooter>
      </Card>

      {/* Alertas */}
      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Alertas Pendientes</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.alertasSinLeer}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className={stats.alertasAltas > 0 ? "sqf-badge-wine" : "sqf-badge-orange"}>
              <AlertTriangle className="size-4" />
              {stats.alertasAltas > 0 ? "Urgentes" : "Alertas"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.alertasAltas > 0 ? (
              <span className="text-red-600">{stats.alertasAltas} alerta(s) de alta prioridad</span>
            ) : (
              "Sin alertas urgentes"
            )}
          </div>
          <div className="text-muted-foreground">Requieren tu atención</div>
        </CardFooter>
      </Card>

      {/* Comidas Registradas */}
      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Comidas Registradas</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {isLoading ? "..." : stats.comidasHoy || 0}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-wine">
              <UtensilsCrossed className="size-4" />
              Hoy
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {stats.comidasSemana > 0 ? (
              <span className="text-purple-600">{stats.comidasSemana} comidas esta semana</span>
            ) : (
              "Sin comidas registradas"
            )}
          </div>
          <div className="text-muted-foreground">
            {stats.promedioCalorias > 0 ? `Promedio: ${stats.promedioCalorias} kcal` : "Seguimiento nutricional"}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
