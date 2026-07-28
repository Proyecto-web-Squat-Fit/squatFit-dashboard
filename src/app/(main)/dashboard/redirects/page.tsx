import { Metadata } from "next";

import { RedirectsView } from "./_components/redirects-view";

export const metadata: Metadata = {
  title: "Redirecciones | Squad Fit",
  description: "Gestor de pretty links (/r/<slug>) del dominio",
};

export default function RedirectsPage() {
  return <RedirectsView />;
}
