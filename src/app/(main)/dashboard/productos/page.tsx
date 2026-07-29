import { Suspense } from "react";

import { Metadata } from "next";

import { ProductosView } from "./_components/productos-view";

export const metadata: Metadata = {
  title: "Productos | Squad Fit",
  description: "Catálogo de productos, concesiones y packs",
};

export default function ProductosPage() {
  return (
    <Suspense>
      <ProductosView />
    </Suspense>
  );
}
