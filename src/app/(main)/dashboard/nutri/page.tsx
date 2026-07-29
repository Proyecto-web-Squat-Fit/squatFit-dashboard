import { Metadata } from "next";

import { NutriLanding } from "./_components/nutri-landing";

export const metadata: Metadata = {
  title: "Nutri | Squad Fit",
  description: "Panel de nutrición: alimentos, recetas y sustituciones",
};

export default function NutriPage() {
  return <NutriLanding />;
}
