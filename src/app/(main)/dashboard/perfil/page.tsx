import { Suspense } from "react";

import { Metadata } from "next";

import { PerfilView } from "./_components/perfil-view";

export const metadata: Metadata = {
  title: "Perfil | Squad Fit",
  description: "Tus datos de acceso al back office",
};

export default function PerfilPage() {
  return (
    <Suspense>
      <PerfilView />
    </Suspense>
  );
}
