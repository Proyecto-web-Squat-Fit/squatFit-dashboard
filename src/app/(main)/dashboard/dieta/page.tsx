import { redirect } from "next/navigation";

// Reestructura del menú (spec 27-jul): Dieta se desglosó en Lista de Alimentos / Banco de Recetas / Sustituciones dentro de Nutri.
// Redirect para no romper los enlaces guardados del equipo.
export default function Page() {
  redirect("/dashboard/nutri");
}
