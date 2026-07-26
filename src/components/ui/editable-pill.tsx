"use client";

import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Píldora editable: muestra el badge y, al hacer clic, un desplegable para
 * cambiar el valor. Chevron para dejar claro que es editable.
 *
 * Nació en el catálogo del rediseño; vive aquí porque la usan varias tablas
 * (cursos, equipo) y el catálogo de aquel lote quedó sustituido por
 * /dashboard/catalogo.
 */
export function EditablePill({
  children,
  options,
  onSelect,
  disabledNote,
}: {
  children: React.ReactNode;
  options: { value: string; label: string }[];
  onSelect?: (value: string) => void;
  /** Si se pasa, el desplegable solo muestra esta nota (valor fijo, no editable) */
  disabledNote?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={disabledNote ?? "Editar"}
          className="inline-flex items-center gap-1 rounded-md outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[#363C98]"
        >
          {children}
          <ChevronDown className="text-muted-foreground h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {disabledNote ? (
          <DropdownMenuItem disabled className="text-muted-foreground max-w-[240px] text-xs whitespace-normal">
            {disabledNote}
          </DropdownMenuItem>
        ) : (
          options.map((o) => (
            <DropdownMenuItem key={o.value} onClick={() => onSelect?.(o.value)}>
              {o.label}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
