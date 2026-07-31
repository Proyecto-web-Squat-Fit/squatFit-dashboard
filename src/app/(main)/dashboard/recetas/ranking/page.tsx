import { Metadata } from "next";

import { RankingRecetasView } from "./_components/ranking-recetas-view";

export const metadata: Metadata = {
  title: "Ranking de recetas | Squad Fit",
  description: "Aperturas, clics y tiempo de lectura por receta, para elegir las muestras gratuitas con datos",
};

export default function RankingRecetasPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <RankingRecetasView />
    </div>
  );
}
