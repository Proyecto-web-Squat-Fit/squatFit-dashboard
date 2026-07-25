"use client";

import { cn } from "@/lib/utils";

export interface FilterChipOption {
  id: string;
  label: string;
}

interface FilterChipsProps {
  /** Etiqueta corta delante de las pastillas («Categoría», «Encargado»…). */
  label: string;
  options: FilterChipOption[];
  /** Ids seleccionados. Vacío = «Todos» (sin filtro). */
  selected: string[];
  onChange: (next: string[]) => void;
  /** Texto de la pastilla que limpia la selección (por defecto «Todos»). */
  allLabel?: string;
  className?: string;
}

/**
 * PASTILLAS DE FILTRO MULTI-SELECCIÓN — paleta de marca del panel.
 *
 * Cada pastilla se puede togglear de forma independiente (selección múltiple);
 * la pastilla «Todos» limpia la selección. Seleccionadas: rellenas en índigo
 * (#363C98) con texto blanco; sin seleccionar: solo borde, con hover naranja
 * (#FF690B). Dark mode incluido.
 */
export function FilterChips({ label, options, selected, onChange, allLabel = "Todos", className }: FilterChipsProps) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const chipClass = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors",
      active
        ? "border-[#363C98] bg-[#363C98] text-white dark:border-[#6d74d8] dark:bg-[#363C98] dark:text-white"
        : cn(
            "border-[#363C98]/35 bg-transparent text-[#363C98]",
            "hover:border-[#FF690B] hover:text-[#FF690B]",
            "dark:border-[#b9bce8]/35 dark:text-[#b9bce8]",
            "dark:hover:border-[#FFB07A] dark:hover:text-[#FFB07A]",
          ),
    );

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} role="group" aria-label={`Filtro: ${label}`}>
      <span className="text-muted-foreground mr-0.5 text-xs font-medium">{label}:</span>
      <button
        type="button"
        aria-pressed={selected.length === 0}
        className={chipClass(selected.length === 0)}
        onClick={() => onChange([])}
      >
        {allLabel}
      </button>
      {options.map((o) => {
        const active = selected.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            className={chipClass(active)}
            onClick={() => toggle(o.id)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
