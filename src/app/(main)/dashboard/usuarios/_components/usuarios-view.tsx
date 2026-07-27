"use client";

import { useState } from "react";

import { useSearchParams } from "next/navigation";

import { BadgeCheck, Users } from "lucide-react";

import { AlumnosCards } from "@/app/(main)/dashboard/alumnos/_components/alumnos-cards";
import { UsuariosDirectoryTable } from "@/app/(main)/dashboard/alumnos/_components/usuarios-directory-table";
import { EntrenadoresCards } from "@/app/(main)/dashboard/equipo/_components/entrenadores-cards";
import { EntrenadoresTable } from "@/app/(main)/dashboard/equipo/_components/entrenadores-table";
import { BrandTabs } from "@/components/brand-tabs";
import { Tabs, TabsContent } from "@/components/ui/tabs";

/**
 * USUARIOS (reestructura 27-jul): contenedor con dos pestañas.
 * - Clientes: la antigua página de Usuarios/Alumnos (directorio + fichas).
 * - Empleados: la antigua página de Equipo (entrenadores y staff).
 * Se reutilizan los componentes existentes de ambas páginas; aquí no hay lógica
 * nueva, solo la agrupación.
 */
export function UsuariosView() {
  const params = useSearchParams();
  const initialTab = params.get("tab") === "empleados" ? "empleados" : "clientes";
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground text-sm">
          Clientes ya convertidos y empleados del equipo. Los leads (aún sin convertir) viven en CRM.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <BrandTabs
          tabs={[
            { id: "clientes", label: "Clientes", icon: <Users className="size-4" /> },
            { id: "empleados", label: "Empleados", icon: <BadgeCheck className="size-4" /> },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />

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
      </Tabs>
    </div>
  );
}
