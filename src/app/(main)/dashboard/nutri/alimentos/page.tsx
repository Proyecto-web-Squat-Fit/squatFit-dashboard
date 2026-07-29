import { Metadata } from "next";

import { ListaAlimentosReal } from "./_components/lista-alimentos-real";

export const metadata: Metadata = {
  title: "Lista de Alimentos | Squad Fit",
  description: "Base de alimentos con macros, categorías y etiquetas",
};

/**
 * LISTA DE ALIMENTOS (reestructura 27-jul): antes era una pestaña de Dieta.
 * DATOS REALES desde el 28-jul: 33.647 alimentos (admin-panel/foods/*, sembrados
 * por scripts/seed-alimentos.ts) — ver ListaAlimentosReal. La vieja
 * /dashboard/dieta (con el banco demo en memoria) redirige aquí.
 */
export default function AlimentosPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Lista de Alimentos</h1>
        <p className="text-muted-foreground text-sm">
          Base de alimentos con macros, familia/categoría, dónde comprarlo y grupo de sustitución.
        </p>
      </div>
      <ListaAlimentosReal />
    </div>
  );
}
