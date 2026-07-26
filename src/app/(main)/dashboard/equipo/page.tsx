import { EntrenadoresCards } from "./_components/entrenadores-cards";
import { EntrenadoresTable } from "./_components/entrenadores-table";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Tarjetas de resumen */}
      <EntrenadoresCards />

      {/* Tabla de entrenadores */}
      <EntrenadoresTable />
    </div>
  );
}
