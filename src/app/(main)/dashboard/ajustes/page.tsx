import { Metadata } from "next";

import { UnderConstruction } from "@/components/under-construction";

export const metadata: Metadata = {
  title: "Ajustes | Squad Fit",
  description: "Configuración general del back office",
};

export default function AjustesPage() {
  return (
    <UnderConstruction
      title="Ajustes"
      description="Configuración general del back office: preferencias del panel, textos y parámetros que hoy están repartidos o hardcodeados."
    />
  );
}
