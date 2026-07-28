"use client";

import { useState } from "react";

import { useSearchParams } from "next/navigation";

import { Handshake, Package, Tags } from "lucide-react";

import { CatalogView } from "@/app/(main)/dashboard/catalogo/_components/catalog-view";
import { PacksCards } from "@/app/(main)/dashboard/packs/_components/packs-cards";
import { PacksTable } from "@/app/(main)/dashboard/packs/_components/packs-table";
import { AdvicePlansView } from "@/app/(main)/dashboard/planes-asesoria/_components/advice-plans-view";
import { BrandTabs } from "@/components/brand-tabs";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";

/**
 * PRODUCTOS (reestructura 27-jul): antes «Catálogo». Absorbe la antigua página
 * de Packs como pestaña interna — Packs desaparece del menú lateral.
 * La pestaña Packs solo la ve un admin (misma restricción que tenía su página).
 *
 * Pestaña «Planes de asesoría» (F2 nº 21, 28-jul): planes de `suscription_plan`
 * vía `GET admin-panel/advice-plans` (solo lectura). Se coloca AQUÍ, como
 * pestaña interna, en vez de como entrada nueva en el sidebar, porque el
 * propio backend describe ese endpoint como algo "para completar el
 * inventario del catálogo unificado del panel" — este panel de Productos es,
 * literalmente, ese catálogo unificado (ya absorbió Packs con el mismo
 * criterio). Visible para todo el staff, igual que la pestaña Catálogo (no
 * tiene el candado de Packs porque no hay nada que solo un admin deba tocar:
 * es de solo lectura).
 */
export function ProductosView() {
  const params = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const requestedTab = params.get("tab");
  const knownTabs = ["catalogo", "asesoria", ...(isAdmin ? ["packs"] : [])];
  const initialTab = requestedTab && knownTabs.includes(requestedTab) ? requestedTab : "catalogo";
  const [activeTab, setActiveTab] = useState(initialTab);

  const tabs = [
    { id: "catalogo", label: "Catálogo", icon: <Tags className="size-4" /> },
    { id: "asesoria", label: "Planes de asesoría", icon: <Handshake className="size-4" /> },
    ...(isAdmin ? [{ id: "packs", label: "Packs", icon: <Package className="size-4" /> }] : []),
  ];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <BrandTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        <TabsContent value="catalogo" className="mt-6">
          <CatalogView />
        </TabsContent>

        <TabsContent value="asesoria" className="mt-6">
          <div className="flex flex-col gap-1 pb-2">
            <h1 className="text-2xl font-bold tracking-tight">Planes de asesoría</h1>
          </div>
          <AdvicePlansView />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="packs" className="mt-6">
            <div className="flex flex-col gap-4 md:gap-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight">Packs</h1>
                <p className="text-muted-foreground text-sm">Gestión de packs de libros.</p>
              </div>
              <PacksCards />
              <PacksTable />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
