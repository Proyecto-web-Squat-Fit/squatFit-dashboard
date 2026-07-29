"use client";

import { useEffect, useState } from "react";

import { useSearchParams } from "next/navigation";

import { BadgeCheck, ShieldCheck, Users } from "lucide-react";

import { AlumnosCards } from "@/app/(main)/dashboard/alumnos/_components/alumnos-cards";
import { UsuariosDirectoryTable } from "@/app/(main)/dashboard/alumnos/_components/usuarios-directory-table";
import { EntrenadoresCards } from "@/app/(main)/dashboard/equipo/_components/entrenadores-cards";
import { EntrenadoresTable } from "@/app/(main)/dashboard/equipo/_components/entrenadores-table";
import { BrandTab, BrandTabs } from "@/components/brand-tabs";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";

import { PermisosView } from "./permisos-view";

/**
 * USUARIOS (reestructura 27-jul): contenedor con tres pestañas.
 * - Clientes: la antigua página de Usuarios/Alumnos (directorio + fichas).
 * - Empleados: la antigua página de Equipo (entrenadores y staff).
 * - Permisos: solo admin (ver comentario de gating más abajo).
 * Se reutilizan los componentes existentes de ambas páginas; aquí no hay lógica
 * nueva, solo la agrupación.
 */
export function UsuariosView() {
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const esAdmin = user?.role?.toLowerCase() === "admin";

  const tabParam = params.get("tab");
  const initialTab = tabParam === "empleados" ? "empleados" : tabParam === "permisos" ? "permisos" : "clientes";
  const [activeTab, setActiveTab] = useState(initialTab);

  // La pestaña Permisos solo existe para admin. Si la URL pedía `?tab=permisos`
  // y el rol (ya resuelto) no es admin, cae a Clientes. Mientras `loading` es
  // true no tocamos `activeTab` para no hacer un salto visible de pestaña.
  useEffect(() => {
    if (!loading && activeTab === "permisos" && !esAdmin) {
      setActiveTab("clientes");
    }
  }, [loading, esAdmin, activeTab]);

  // Mientras el rol carga, no se muestra la pestaña Permisos (evita el parpadeo
  // de que aparezca y luego desaparezca si el usuario no es admin).
  const tabs: BrandTab[] = [
    { id: "clientes", label: "Clientes", icon: <Users className="size-4" /> },
    { id: "empleados", label: "Empleados", icon: <BadgeCheck className="size-4" /> },
    ...(!loading && esAdmin ? [{ id: "permisos", label: "Permisos", icon: <ShieldCheck className="size-4" /> }] : []),
  ];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground text-sm">
          Clientes ya convertidos y empleados del equipo. Los leads (aún sin convertir) viven en CRM.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <BrandTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        <TabsContent value="clientes" className="mt-6">
          <div className="flex flex-col gap-4 md:gap-6">
            <AlumnosCards />
            <UsuariosDirectoryTable />
          </div>
        </TabsContent>

        <TabsContent value="empleados" className="mt-6">
          <div className="flex flex-col gap-4 md:gap-6">
            <EntrenadoresCards />
            <EntrenadoresTable />
          </div>
        </TabsContent>

        {!loading && esAdmin && (
          <TabsContent value="permisos" className="mt-6">
            <PermisosView />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
