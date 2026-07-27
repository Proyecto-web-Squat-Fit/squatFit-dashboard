import { redirect } from "next/navigation";

// Reestructura del menú (spec 27-jul): Usuarios agrupa ahora Clientes y Empleados (la ficha /alumnos/[id] sigue igual).
// Redirect para no romper los enlaces guardados del equipo.
export default function Page() {
  redirect("/dashboard/usuarios");
}
