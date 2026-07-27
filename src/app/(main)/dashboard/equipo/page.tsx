import { redirect } from "next/navigation";

// Reestructura del menú (spec 27-jul): Equipo es ahora la pestaña Empleados dentro de Usuarios.
// Redirect para no romper los enlaces guardados del equipo.
export default function Page() {
  redirect("/dashboard/usuarios?tab=empleados");
}
