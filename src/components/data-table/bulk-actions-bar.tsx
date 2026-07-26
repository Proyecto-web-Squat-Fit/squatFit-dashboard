"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface BulkAction {
  value: string;
  label: string;
}

/**
 * Barra de "Acciones en lote" del diseño: desplegable + botón Aplicar,
 * SIEMPRE visible (no aparece/desaparece con la selección). Si no hay filas
 * seleccionadas, Aplicar queda deshabilitado y se muestra la pista.
 */
export function BulkActionsBar({
  actions,
  selectedCount,
  onApply,
}: {
  actions: BulkAction[];
  selectedCount: number;
  onApply: (action: string) => void;
}) {
  const [action, setAction] = useState<string>("");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={action} onValueChange={setAction}>
        <SelectTrigger className="w-[220px] border-[#FF690B]/60 text-[#FF690B] data-[placeholder]:text-[#FF690B]/70">
          <SelectValue placeholder="Acciones en lote" />
        </SelectTrigger>
        <SelectContent>
          {actions.map((a) => (
            <SelectItem key={a.value} value={a.value}>
              {a.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        className="bg-[#FF690B] hover:bg-[#e55e0a]"
        disabled={!action || selectedCount === 0}
        onClick={() => action && onApply(action)}
      >
        Aplicar
      </Button>
      <span className="text-muted-foreground text-sm">
        {selectedCount > 0 ? `${selectedCount} seleccionado(s)` : "Selecciona filas para aplicar"}
      </span>
    </div>
  );
}
