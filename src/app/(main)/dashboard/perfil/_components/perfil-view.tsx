"use client";

import { KeyRound, LogOut, Mail, Shield, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { avatarSrc } from "@/lib/avatar";
import { getInitials } from "@/lib/utils";

/**
 * PERFIL — "la persona", frente a Ajustes, que es "la casa" (el criterio lo fijó
 * la reestructura del 27-jul y está escrito en ajustes-view.tsx).
 *
 * Hasta ahora no existía: pulsar tu nombre o tu foto en el menú no llevaba a
 * ningún sitio porque no había adónde ir. Esta primera versión sigue la misma
 * forma que el perfil del dashboard de cliente (profile-panel): una cabecera
 * con avatar y nombre, una tarjeta de datos y otra de cuenta con "cambiar
 * contraseña" y "cerrar sesión".
 *
 * Es de SOLO LECTURA a propósito. El panel no tiene hoy ningún endpoint para
 * que un miembro del staff edite sus propios datos —los usuarios se gestionan
 * desde Usuarios, y ahí manda un admin—, así que un formulario editable sería
 * un formulario que no guarda. Cuando exista el endpoint, los campos ya están
 * colocados.
 */

/** Etiqueta legible para el rol, que en el token viene en minúsculas y en inglés. */
const ROLES: Record<string, string> = {
  admin: "Administrador",
  adviser: "Asesor",
  support: "Soporte",
  trainer: "Entrenador",
  nutritionist: "Nutricionista",
};

function Dato({ icono: Icono, etiqueta, valor }: { icono: typeof UserIcon; etiqueta: string; valor: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="text-muted-foreground mt-0.5">
        <Icono className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">{etiqueta}</p>
        <p className="mt-0.5 truncate text-sm font-medium">{valor}</p>
      </div>
    </div>
  );
}

export function PerfilView() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-56 rounded-xl lg:col-span-2" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          No hay sesión iniciada.{" "}
          <a href="/auth/v1/login" className="text-primary font-medium underline-offset-4 hover:underline">
            Entrar
          </a>
        </CardContent>
      </Card>
    );
  }

  // El token no siempre trae nombre (los emitidos antes de julio no lo tienen),
  // así que el email es la última red: nunca se enseña una cabecera vacía.
  const nombre = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const titulo = nombre || user.email;
  const rol = ROLES[user.role.toLowerCase()] ?? user.role;

  const cerrarSesion = async () => {
    try {
      await logout();
      toast.success("Sesión cerrada");
    } catch {
      toast.error("No se pudo cerrar la sesión");
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera: avatar grande + quién eres */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:text-left">
          <Avatar className="size-20 shrink-0">
            {/* Sin gender en el token: aquí siempre sale el neutro hasta que el
                backend devuelva el sexo del propio usuario del panel. */}
            <AvatarImage src={avatarSrc(null, null)} alt={titulo} />
            <AvatarFallback className="text-lg">{getInitials(titulo)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold">{titulo}</h2>
            <p className="text-muted-foreground mt-0.5 truncate text-sm">{user.email}</p>
            <Badge variant="secondary" className="mt-2">
              {rol}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Datos personales */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="text-primary size-5" />
              Datos personales
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y">
              <Dato icono={UserIcon} etiqueta="Nombre" valor={nombre || "—"} />
              <Dato icono={Mail} etiqueta="Email" valor={user.email} />
              <Dato icono={Shield} etiqueta="Rol" valor={rol} />
            </div>
            <p className="text-muted-foreground mt-4 text-xs">
              Estos datos los gestiona un administrador desde Usuarios. Para cambiarlos, pídeselo.
            </p>
          </CardContent>
        </Card>

        {/* Cuenta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="text-primary size-5" />
              Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            <button
              type="button"
              onClick={() =>
                toast.info("Escríbele a un administrador para que te la cambie desde Usuarios.", {
                  description: "El panel todavía no deja cambiarte la contraseña tú mismo.",
                })
              }
              className="hover:bg-muted flex w-full cursor-pointer items-center gap-2.5 rounded-md p-3 text-left text-sm font-medium transition-colors"
            >
              <KeyRound className="text-muted-foreground size-4" />
              Cambiar contraseña
            </button>
            <Separator />
            <button
              type="button"
              onClick={cerrarSesion}
              className="text-destructive hover:bg-destructive/10 flex w-full cursor-pointer items-center gap-2.5 rounded-md p-3 text-left text-sm font-medium transition-colors"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
