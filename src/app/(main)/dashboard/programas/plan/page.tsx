import { Metadata } from "next";

import { UnderConstruction } from "@/components/under-construction";

export const metadata: Metadata = {
  title: "Mi plan | Squad Fit",
  description: "Editor del plan diario que ve el cliente",
};

export default function PlanPage() {
  return (
    <UnderConstruction
      title="Mi plan"
      description="Espejo de edición del «Mi plan» del dashboard cliente: tareas de hoy, entrenamiento, suplementación e indicaciones que ve cada cliente."
    />
  );
}
