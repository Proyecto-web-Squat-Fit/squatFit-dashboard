import { Metadata } from "next";

import { LibrosCards } from "@/app/(main)/dashboard/libros/_components/libros-cards";
import { LibrosTable } from "@/app/(main)/dashboard/libros/_components/libros-table";

export const metadata: Metadata = {
  title: "Cocina | Squad Fit",
  description: "Gestión de libros digitales y físicos (antes «Libros», renombrado por coherencia con el front)",
};

/**
 * COCINA (reestructura 27-jul): antes «Libros». Mismo contenido — se renombra
 * por coherencia con la sección Cocina del front del cliente.
 */
export default function CocinaPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Cocina</h1>
        <p className="text-muted-foreground text-sm">Libros digitales y físicos de la sección Cocina.</p>
      </div>
      <LibrosCards />
      <LibrosTable />
    </div>
  );
}
