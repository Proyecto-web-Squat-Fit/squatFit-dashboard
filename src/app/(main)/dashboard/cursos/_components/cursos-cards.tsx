"use client";

import { useMemo } from "react";

import { TrendingUp, GraduationCap, Users, DollarSign } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCursos } from "@/hooks/use-cursos";

export function CursosCards() {
  const { data: cursos = [], isLoading } = useCursos();

  // Calcular estadísticas: students ya viene numérico del servicio; usamos Number() por si acaso y sumamos números (0+1+0=1).
  const stats = useMemo(() => {
    const total = cursos.length;
    const activos = cursos.filter((c) => c.status === "Activo").length;
    const inactivos = cursos.filter((c) => c.status === "Inactivo").length;
    const enDesarrollo = cursos.filter((c) => c.status === "En Desarrollo").length;
    const totalEstudiantes = cursos.reduce((sum, c) => sum + (Number(c.students) || 0), 0);
    const promedioEstudiantes = total > 0 ? Math.round(totalEstudiantes / total) : 0;
    const ingresosPotenciales = cursos.reduce((sum, c) => sum + (c.price || 0) * (Number(c.students) || 0), 0);
    const precioPromedio = total > 0 ? cursos.reduce((sum, c) => sum + (c.price || 0), 0) / total : 0;

    return {
      total,
      activos,
      inactivos,
      enDesarrollo,
      totalEstudiantes,
      promedioEstudiantes,
      ingresosPotenciales,
      precioPromedio,
    };
  }, [cursos]);

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
          <CardDescription>Cursos Totales</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{stats.total}</CardTitle>
          <CardAction>
            <Badge variant="outline">
              <GraduationCap className="size-4" />
              Total
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Catálogo completo de cursos</div>
          <div className="text-muted-foreground">
            {stats.activos} activos, {stats.inactivos} inactivo{stats.inactivos !== 1 ? "s" : ""}, {stats.enDesarrollo}{" "}
            en desarrollo
          </div>
        </CardFooter>
      </Card>

      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Cursos Activos</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{stats.activos}</CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-green">
              <TrendingUp className="size-4" />
              Disponibles
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Disponibles para inscripción</div>
          <div className="text-muted-foreground">
            {Number(stats.totalEstudiantes).toLocaleString("es-ES")} estudiantes activos
          </div>
        </CardFooter>
      </Card>

      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Total Estudiantes</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {Number(stats.totalEstudiantes).toLocaleString("es-ES")}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-indigo">
              <Users className="size-4" />
              Activos
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Estudiantes inscritos totales</div>
          <div className="text-muted-foreground">
            Promedio {Number(stats.promedioEstudiantes).toLocaleString("es-ES")} estudiantes por curso
          </div>
        </CardFooter>
      </Card>

      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Ingresos Potenciales</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            €{stats.ingresosPotenciales.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-orange">
              <DollarSign className="size-4" />
              Total
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Basado en inscripciones actuales</div>
          <div className="text-muted-foreground">Precio promedio: €{stats.precioPromedio.toFixed(2)} por curso</div>
        </CardFooter>
      </Card>
    </div>
  );
}
