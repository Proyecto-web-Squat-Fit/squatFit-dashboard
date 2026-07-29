import { redirect } from "next/navigation";

// Recuperación de la PR #20 (cerrada al mergear su base sin haberla mergeado):
// en su origen esta era una página de primer nivel del grupo "Sistema". La
// segunda pasada del menú (29-jul) dejó ese grupo solo con Ajustes, así que
// Redirecciones pasa a vivir como pestaña de Ajustes (mismo criterio que
// Integraciones). Redirect para no romper enlaces guardados a esta ruta.
export default function Page() {
  redirect("/dashboard/ajustes?tab=redirects");
}
