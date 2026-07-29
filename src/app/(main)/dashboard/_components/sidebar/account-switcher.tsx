"use client";

import { useState } from "react";

import Link from "next/link";

import { BadgeCheck, LogOut, Settings } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { avatarSrc } from "@/lib/avatar";
import { cn, getInitials } from "@/lib/utils";

export function AccountSwitcher({
  users,
}: {
  readonly users: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly email: string;
    readonly avatar: string;
    readonly role: string;
  }>;
}) {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Si no hay usuario autenticado, usar el primer usuario de la lista
  const activeUser = user
    ? {
        id: "current",
        // Antes aquí iba `user.email` y por eso la cabecera enseñaba el correo
        // en el hueco del nombre. El token trae nombre y apellidos; el email se
        // queda como red por si el token es viejo y no los lleva.
        name: [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email,
        email: user.email,
        // El avatar iba vacío, así que `src` salía `undefined` y el navegador
        // pintaba una imagen rota en la esquina. Ahora cae en el de reserva.
        avatar: avatarSrc(null, null),
        role: user.role,
      }
    : users[0];

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
      toast.success("Sesión cerrada exitosamente");
    } catch {
      toast.error("Error al cerrar sesión");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-9 rounded-lg">
          <AvatarImage src={activeUser.avatar || undefined} alt={activeUser.name} />
          <AvatarFallback className="rounded-lg">{getInitials(activeUser.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
        {user ? (
          // Mostrar usuario autenticado
          // Pulsar tu nombre o tu foto aquí no hacía nada: era un item sin
          // acción. Ahora lleva a Perfil, que es a donde va todo el mundo a
          // buscarlo.
          <DropdownMenuItem asChild className="bg-accent/50 border-l-primary border-l-2 p-0">
            <Link href="/dashboard/perfil" className="flex w-full items-center justify-between gap-2 px-1 py-1.5">
              <Avatar className="size-10 rounded-lg">
                <AvatarImage src={activeUser.avatar || undefined} alt={activeUser.name} />
                <AvatarFallback className="rounded-lg">{getInitials(activeUser.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{activeUser.name}</span>
                <span className="text-muted-foreground truncate text-xs">{activeUser.email}</span>
              </div>
            </Link>
          </DropdownMenuItem>
        ) : (
          // Mostrar lista de usuarios si no hay usuario autenticado
          users.map((user) => (
            <DropdownMenuItem
              key={user.email}
              className={cn("p-0", user.id === activeUser.id && "bg-accent/50 border-l-primary border-l-2")}
            >
              <div className="flex w-full items-center justify-between gap-2 px-1 py-1.5">
                <Avatar className="size-10 rounded-lg">
                  <AvatarImage src={user.avatar || undefined} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs capitalize">{user.role}</span>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        {/*
          Aquí había tres items de la plantilla —Cuenta, Facturación y
          Notificaciones— que no hacían absolutamente nada al pulsarlos. Se
          quedan los dos que sí tienen a dónde ir en este panel; «Facturación»
          se cae porque el back office no factura a su propio staff.
        */}
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/perfil">
              <BadgeCheck />
              Mi perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/ajustes">
              <Settings />
              Ajustes
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={isLoggingOut ? "cursor-not-allowed opacity-50" : ""}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
