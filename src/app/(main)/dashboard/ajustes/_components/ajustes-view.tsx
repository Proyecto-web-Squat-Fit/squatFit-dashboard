"use client";

import { useState } from "react";

import { useSearchParams } from "next/navigation";

import { Link2, Plug } from "lucide-react";

import { RedirectsView } from "@/app/(main)/dashboard/redirects/_components/redirects-view";
import { BrandTab, BrandTabs } from "@/components/brand-tabs";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";

import { IntegracionesView } from "./integraciones-view";

/**
 * AJUSTES (reestructura 27-jul, spec Hamlet): "la casa" (se consulta poco),
 * frente a Perfil ("la persona"). Mismo patrón de contenedor de pestañas que
 * Usuarios. Se dejó lista para que añadir una pestaña más fuera trivial: un
 * objeto en `AJUSTES_TABS` + su `TabsContent`.
 *
 * - Integraciones (admin + soporte): gating dentro de IntegracionesView, no
 *   se duplica en este nivel.
 * - Redirecciones (recuperada de la PR #20, cerrada sin mergear al mergear su
 *   base `feature/bo-reestructura-menu`): en aquella PR iba como item propio
 *   del grupo "Sistema", pero la segunda pasada del menú (29-jul) dejó ese
 *   grupo con solo Ajustes. Mismo criterio que Integraciones: pasa a ser
 *   pestaña de Ajustes en vez de resucitar un item de primer nivel. Solo
 *   admin (histórico: gestión de Pretty Links siempre fue solo-admin), así
 *   que el gating sí va a nivel de este componente.
 */

const ALL_AJUSTES_TABS: (BrandTab & { adminOnly?: boolean })[] = [
  { id: "integraciones", label: "Integraciones", icon: <Plug className="size-4" /> },
  { id: "redirects", label: "Redirecciones", icon: <Link2 className="size-4" />, adminOnly: true },
];

export function AjustesView() {
  const params = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const ajustesTabs = ALL_AJUSTES_TABS.filter((t) => !t.adminOnly || isAdmin);
  const defaultTab = ajustesTabs[0].id;

  const tabParam = params.get("tab");
  const initialTab = ajustesTabs.some((t) => t.id === tabParam) ? (tabParam as string) : defaultTab;
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground text-sm">
          Configuración general del back office: preferencias del panel y salud de los servicios conectados.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <BrandTabs tabs={ajustesTabs} active={activeTab} onChange={setActiveTab} />

        <TabsContent value="integraciones" className="mt-6">
          <IntegracionesView />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="redirects" className="mt-6">
            <RedirectsView />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
