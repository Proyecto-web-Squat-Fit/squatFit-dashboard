import { Metadata } from "next";

import { ListaAlimentos } from "@/app/(main)/dashboard/dieta/_components/lista-alimentos";

export const metadata: Metadata = {
  title: "Lista de Alimentos | Squad Fit",
  description: "Base de alimentos con macros, categorías y etiquetas",
};

/**
 * LISTA DE ALIMENTOS (reestructura 27-jul): antes era una pestaña de Dieta.
 * Se reutiliza el componente existente; la vieja /dashboard/dieta redirige a Nutri.
 */
export default function AlimentosPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Lista de Alimentos</h1>
        <p className="text-muted-foreground text-sm">Base de alimentos con macros, categorías y etiquetas.</p>
      </div>
      <ListaAlimentos />
    </div>
  );
}
