"use client";

import { useState } from "react";

import { useSearchParams } from "next/navigation";

import { Plug } from "lucide-react";

import { BrandTab, BrandTabs } from "@/components/brand-tabs";
import { Tabs, TabsContent } from "@/components/ui/tabs";

import { IntegracionesView } from "./integraciones-view";

/**
 * AJUSTES (reestructura 27-jul, spec Hamlet): "la casa" (se consulta poco),
 * frente a Perfil ("la persona"). Mismo patrón de contenedor de pestañas que
 * Usuarios. Por ahora solo hay una pestaña real —Integraciones, que antes era
 * un item de primer nivel del menú— pero se deja como lista para que añadir
 * la siguiente pestaña de Ajustes sea trivial: un objeto más en
 * `AJUSTES_TABS` + su `TabsContent`.
 *
 * El gating de Integraciones (admin + soporte) vive DENTRO de
 * IntegracionesView tal cual estaba; no se duplica en este nivel.
 */

const AJUSTES_TABS: BrandTab[] = [{ id: "integraciones", label: "Integraciones", icon: <Plug className="size-4" /> }];

const DEFAULT_TAB = AJUSTES_TABS[0].id;

export function AjustesView() {
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const initialTab = AJUSTES_TABS.some((t) => t.id === tabParam) ? (tabParam as string) : DEFAULT_TAB;
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
        <BrandTabs tabs={AJUSTES_TABS} active={activeTab} onChange={setActiveTab} />

        <TabsContent value="integraciones" className="mt-6">
          <IntegracionesView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
