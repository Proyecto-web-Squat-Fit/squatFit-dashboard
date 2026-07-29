"use client";

import { useState } from "react";

import Link from "next/link";

import { CircleUser, EllipsisVertical, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/auth-context";
import { avatarSrc } from "@/lib/avatar";
import { getInitials } from "@/lib/utils";

export function NavUser() {
  const { user, logout, loading } = useAuth();
  const { isMobile } = useSidebar();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Debug logs

  const handleLogout = async () => {
    console.log("🔄 Iniciando logout desde NavUser...");
    setIsLoggingOut(true);

    try {
      console.log("📞 Llamando a logout() del contexto...");
      await logout();
      console.log("✅ Logout exitoso desde NavUser");
      toast.success("Sesión cerrada exitosamente");
    } catch (error) {
      console.error("❌ Error en logout desde NavUser:", error);
      toast.error("Error al cerrar sesión");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Mostrar skeleton mientras carga
  if (loading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="bg-muted h-8 w-8 animate-pulse rounded-lg" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <div className="bg-muted h-4 animate-pulse rounded" />
              <div className="bg-muted h-3 w-2/3 animate-pulse rounded" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Si no hay usuario después de cargar
  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild>
            <a href="/auth/v1/login" className="flex items-center gap-2">
              <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-lg">
                <LogOut className="h-4 w-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">No autenticado</span>
                <span className="text-muted-foreground truncate text-xs">Hacer clic para login</span>
              </div>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  console.log("✅ NavUser - Usuario cargado correctamente:", user.email);

  // El menú enseñaba el email en la línea del nombre. Ahora va el nombre y el
  // email debajo; si el token es antiguo y no trae nombre, el email sube a la
  // primera línea para no dejarla en blanco.
  const nombreVisible = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {/* `grayscale` fuera: apagaba el avatar y con foto real quedaba
                  en gris. */}
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatarSrc(null, null)} alt={nombreVisible} />
                <AvatarFallback className="rounded-lg">{getInitials(nombreVisible)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{nombreVisible}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              </div>
              <EllipsisVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            {/* La cabecera del desplegable era un `DropdownMenuLabel`, o sea
                texto muerto: pulsar tu nombre o tu foto no hacía nada. Ahora es
                el enlace a Perfil, que es lo que espera cualquiera al pulsarlo. */}
            <DropdownMenuItem asChild className="p-0 font-normal">
              <Link href="/dashboard/perfil" className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarSrc(null, null)} alt={nombreVisible} />
                  <AvatarFallback className="rounded-lg">{getInitials(nombreVisible)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{nombreVisible}</span>
                  <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                </div>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/perfil">
                <CircleUser />
                Mi perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={isLoggingOut ? "cursor-not-allowed opacity-50" : ""}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? "Cerrando sesión..." : "Cerrar Sesión"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
