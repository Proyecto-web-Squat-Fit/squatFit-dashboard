import { Metadata } from "next";

import { IntegracionesView } from "./_components/integraciones-view";

export const metadata: Metadata = {
  title: "Integraciones | Squad Fit",
  description: "Salud de las integraciones externas del sistema",
};

export default function IntegracionesPage() {
  return <IntegracionesView />;
}
