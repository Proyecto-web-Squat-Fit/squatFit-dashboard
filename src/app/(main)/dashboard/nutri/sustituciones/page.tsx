import { Metadata } from "next";

import { SustitucionesRestricciones } from "@/app/(main)/dashboard/dieta/_components/sustituciones-restricciones";

export const metadata: Metadata = {
  title: "Sustituciones | Squad Fit",
  description: "Equivalencias e intercambios entre alimentos y restricciones",
};

/**
 * SUSTITUCIONES (reestructura 27-jul): antes era una pestaña de Dieta.
 * Se reutiliza el componente existente; la vieja /dashboard/dieta redirige a Nutri.
 */
export default function SustitucionesPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Sustituciones</h1>
        <p className="text-muted-foreground text-sm">
          Equivalencias e intercambios entre alimentos, y restricciones alimentarias.
        </p>
      </div>
      <SustitucionesRestricciones />
    </div>
  );
}
