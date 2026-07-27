import { Suspense } from "react";

import { Metadata } from "next";

import { UsuariosView } from "./_components/usuarios-view";

export const metadata: Metadata = {
  title: "Usuarios | Squad Fit",
  description: "Clientes y empleados de Squad Fit",
};

export default function UsuariosPage() {
  return (
    <Suspense>
      <UsuariosView />
    </Suspense>
  );
}
