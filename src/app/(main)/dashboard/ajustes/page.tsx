import { Suspense } from "react";

import { Metadata } from "next";

import { AjustesView } from "./_components/ajustes-view";

export const metadata: Metadata = {
  title: "Ajustes | Squad Fit",
  description: "Configuración general del back office",
};

export default function AjustesPage() {
  return (
    <Suspense>
      <AjustesView />
    </Suspense>
  );
}
