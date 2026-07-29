import { redirect } from "next/navigation";

// Reestructura del menú (spec 27-jul): Integraciones es ahora la pestaña Integraciones dentro de Ajustes.
// Redirect para no romper los enlaces guardados.
export default function Page() {
  redirect("/dashboard/ajustes?tab=integraciones");
}
