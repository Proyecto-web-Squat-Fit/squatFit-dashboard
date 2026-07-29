import { Metadata } from "next";

import { CuponesView } from "./_components/cupones-view";

export const metadata: Metadata = {
  title: "Cupones | Squad Fit",
  description: "Edición manual de cupones de descuento",
};

export default function CuponesPage() {
  return <CuponesView />;
}
