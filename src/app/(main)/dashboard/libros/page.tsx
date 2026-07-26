import { Metadata } from "next";

import { LibrosCards } from "./_components/libros-cards";
import { LibrosTable } from "./_components/libros-table";

export const metadata: Metadata = {
  title: "Cocina | Squad Fit",
  description: "Gestión de libros digitales y físicos",
};

export default function LibrosPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Tarjetas de resumen */}
      <LibrosCards />

      {/* Tabla de libros */}
      <LibrosTable />
    </div>
  );
}
