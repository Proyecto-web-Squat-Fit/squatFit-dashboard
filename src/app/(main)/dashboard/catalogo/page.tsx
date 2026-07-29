import { redirect } from "next/navigation";

// Reestructura del menú (spec 27-jul): Catálogo pasó a llamarse Productos.
// Redirect para no romper los enlaces guardados del equipo.
export default function Page() {
  redirect("/dashboard/productos");
}
