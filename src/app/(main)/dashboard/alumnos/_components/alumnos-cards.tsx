"use client";

import { useMemo } from "react";

import { Users, UserCheck, Activity } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAlumnos } from "@/hooks/use-alumnos";

export function AlumnosCards() {
  const { data: alumnosData } = useAlumnos({ page: 1, limit: 1000 });

  const stats = useMemo(() => {
    // Validar que alumnosData exista y sea un array
    if (!alumnosData || !Array.isArray(alumnosData)) {
      return {
        total: 0,
        activos: 0,
        usuarios: 0,
        coaches: 0,
        admins: 0,
      };
    }

    const total = alumnosData.length;
    const activos = alumnosData.filter((a) => a.status?.toLowerCase() === "active").length;
    const usuarios = alumnosData.filter((a) => a.role?.toLowerCase() === "user").length;
    const coaches = alumnosData.filter((a) => a.role?.toLowerCase() === "coach").length;
    const admins = alumnosData.filter((a) => a.role?.toLowerCase() === "admin").length;

    return { total, activos, usuarios, coaches, admins };
  }, [alumnosData]);

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Alumnos Totales</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{stats.total}</CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Users className="size-4" />
              Total
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Base de alumnos registrados</div>
          <div className="text-muted-foreground">
            {stats.activos} activos, {stats.total - stats.activos} inactivos
          </div>
        </CardFooter>
      </Card>

      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Alumnos Activos</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{stats.activos}</CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-green">
              <UserCheck className="size-4" />
              {stats.total > 0 ? Math.round((stats.activos / stats.total) * 100) : 0}% activos
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Usuarios con sesión activa</div>
          <div className="text-muted-foreground">Iniciaron sesión recientemente</div>
        </CardFooter>
      </Card>

      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Usuarios</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{stats.usuarios}</CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-indigo">
              <Users className="size-4" />
              Alumnos
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Rol: Usuario</div>
          <div className="text-muted-foreground">
            {stats.total > 0 ? Math.round((stats.usuarios / stats.total) * 100) : 0}% del total
          </div>
        </CardFooter>
      </Card>

      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Distribución de Roles</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.coaches + stats.admins}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-wine">
              <Activity className="size-4" />
              Staff
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Coaches y Administradores</div>
          <div className="text-muted-foreground">
            {stats.coaches} coaches, {stats.admins} admins
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
