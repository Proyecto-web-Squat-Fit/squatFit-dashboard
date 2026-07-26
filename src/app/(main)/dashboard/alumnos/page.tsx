import { AlumnosCards } from "./_components/alumnos-cards";
import { UsuariosDirectoryTable } from "./_components/usuarios-directory-table";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Tarjetas de resumen */}
      <AlumnosCards />

      {/* Directorio de usuarios (diseño: pestañas + asignados + roles) */}
      <UsuariosDirectoryTable />
    </div>
  );
}
