import { Metadata } from "next";

import { UnderConstruction } from "@/components/under-construction";

export const metadata: Metadata = {
  title: "Recursos | Squad Fit",
  description: "Gestor de recursos del programa (guías, vídeos, descargables, FAQ)",
};

export default function RecursosPage() {
  return (
    <UnderConstruction
      title="Recursos"
      description="Gestor de los recursos que ve el cliente en su programa: guías, vídeos, descargables y preguntas frecuentes."
    />
  );
}
