import { redirect } from "next/navigation";

// Reestructura del menú (spec 27-jul): Libros pasó a llamarse Cocina (coherencia con el front).
// Redirect para no romper los enlaces guardados del equipo.
export default function Page() {
  redirect("/dashboard/cocina");
}
