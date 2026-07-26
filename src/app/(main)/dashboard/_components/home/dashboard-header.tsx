"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Home } from "lucide-react";

/**
 * Header del dashboard con saludo dinámico y fecha actual
 */
export function DashboardHeader() {
  const now = new Date();

  const formattedDate = format(now, "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: es,
  });

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
          <Home className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inicio</h1>
          <p className="text-muted-foreground text-sm capitalize">{formattedDate}</p>
        </div>
      </div>
    </div>
  );
}
