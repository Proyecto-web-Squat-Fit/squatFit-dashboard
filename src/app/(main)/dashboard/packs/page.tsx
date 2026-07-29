import { redirect } from "next/navigation";

// Reestructura del menú (spec 27-jul): Packs vive ahora como pestaña interna de Productos.
// Redirect para no romper los enlaces guardados del equipo.
export default function Page() {
  redirect("/dashboard/productos?tab=packs");
}
