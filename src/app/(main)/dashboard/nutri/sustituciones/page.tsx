import { Metadata } from "next";

import { SustitucionesReal } from "./_components/sustituciones-real";

export const metadata: Metadata = {
  title: "Sustituciones | Squad Fit",
  description: "Equivalencias e intercambios entre alimentos y restricciones",
};

/**
 * SUSTITUCIONES (reestructura 27-jul): antes era una pestaña de Dieta.
 * DATOS REALES desde el 28-jul: grupos de sustitución + productos recomendados +
 * equivalencias EEUU + pares ES-USA (admin-panel/foods/*, sembrados por
 * scripts/seed-alimentos.ts). El modelo real es por GRUPO (misma categoría +
 * banda de kcal), no pares 1:1 — por eso se reemplaza el mock anterior
 * (sustituciones-restricciones.tsx, que sigue sirviendo /dashboard/dieta si se
 * visita directo) por una vista nueva con 4 pestañas. La vieja /dashboard/dieta
 * redirige aquí.
 */
export default function SustitucionesPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Sustituciones</h1>
        <p className="text-muted-foreground text-sm">
          Equivalencias e intercambios entre alimentos, productos recomendados y selector ES/USA.
        </p>
      </div>
      <SustitucionesReal />
    </div>
  );
}
