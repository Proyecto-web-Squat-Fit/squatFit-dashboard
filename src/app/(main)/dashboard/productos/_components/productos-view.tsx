"use client";

import { useState } from "react";

import { useSearchParams } from "next/navigation";

import { Package, Tags } from "lucide-react";

import { CatalogView } from "@/app/(main)/dashboard/catalogo/_components/catalog-view";
import { PacksCards } from "@/app/(main)/dashboard/packs/_components/packs-cards";
import { PacksTable } from "@/app/(main)/dashboard/packs/_components/packs-table";
import { BrandTabs } from "@/components/brand-tabs";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";

/**
 * PRODUCTOS (reestructura 27-jul): antes «Catálogo». Absorbe la antigua página
 * de Packs como pestaña interna — Packs desaparece del menú lateral.
 * La pestaña Packs solo la ve un admin (misma restricción que tenía su página).
 */
export function ProductosView() {
  const params = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const initialTab = params.get("tab") === "packs" && isAdmin ? "packs" : "catalogo";
  const [activeTab, setActiveTab] = useState(initialTab);

  const tabs = [
    { id: "catalogo", label: "Catálogo", icon: <Tags className="size-4" /> },
    ...(isAdmin ? [{ id: "packs", label: "Packs", icon: <Package className="size-4" /> }] : []),
  ];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <BrandTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        <TabsContent value="catalogo" className="mt-6">
          <CatalogView />
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
