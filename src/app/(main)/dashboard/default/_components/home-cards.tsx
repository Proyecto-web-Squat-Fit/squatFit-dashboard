"use client";

/**
 * Cards de métricas principales del HOME
 * Muestra: Ventas Totales, Tareas Pendientes, Asesorías Activas, Cursos Disponibles
 */

import { CheckSquare, ClipboardList, Euro, GraduationCap } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePendingTasksCount } from "@/hooks/use-admin-tasks";
import { useAdvices } from "@/hooks/use-advices";
import { useCursos } from "@/hooks/use-cursos";
import { useTotalSales } from "@/hooks/use-sales";

// ============================================================================
// COMPONENTE: CARD DE VENTAS TOTALES
// ============================================================================

export function VentasTotalesCard() {
  const { data, isLoading, error } = useTotalSales();

  if (error) {
    return (
      <Card className="sqf-metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
          <Euro className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-muted-foreground text-xs">No se obtuvieron datos</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="sqf-metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
          <Euro className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-2 h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sqf-metric-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
        <Euro className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{(data?.courses ?? 0) + (data?.advices ?? 0) + (data?.books ?? 0)}</div>
        <p className="text-muted-foreground text-xs">Total de transacciones</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENTE: CARD DE TAREAS PENDIENTES
// ============================================================================

export function TareasPendientesCard() {
  const count = usePendingTasksCount();

  return (
    <Card className="sqf-metric-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Tareas Pendientes</CardTitle>
        <CheckSquare className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
        <p className="text-muted-foreground text-xs">Asignadas a ti</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENTE: CARD DE ASESORÍAS ACTIVAS
// ============================================================================

export function AsesoriasActivasCard() {
  const { data, isLoading, error } = useAdvices({ limit: 1, page: 1 });

  if (error) {
    return (
      <Card className="sqf-metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Planes</CardTitle>
          <ClipboardList className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-muted-foreground text-xs">No se obtuvieron datos</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="sqf-metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Planes</CardTitle>
          <ClipboardList className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-2 h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sqf-metric-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Planes</CardTitle>
        <ClipboardList className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{data?.length ?? 0}</div>
        <p className="text-muted-foreground text-xs">Total registradas</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENTE: CARD DE CURSOS DISPONIBLES
// ============================================================================

export function CursosDisponiblesCard() {
  const { data, isLoading, error } = useCursos();

  if (error) {
    return (
      <Card className="sqf-metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cursos</CardTitle>
          <GraduationCap className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">0</div>
          <p className="text-muted-foreground text-xs">No se obtuvieron datos</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="sqf-metric-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cursos</CardTitle>
          <GraduationCap className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="mt-2 h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  const cursosArray = Array.isArray(data) ? data : [];

  return (
    <Card className="sqf-metric-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Cursos</CardTitle>
        <GraduationCap className="text-muted-foreground h-4 w-4" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{cursosArray.length}</div>
        <p className="text-muted-foreground text-xs">Cursos disponibles</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL: GRID DE CARDS
// ============================================================================

export function HomeCards() {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs md:grid-cols-2 lg:grid-cols-4">
      <VentasTotalesCard />
      <TareasPendientesCard />
      <AsesoriasActivasCard />
      <CursosDisponiblesCard />
    </div>
  );
}
