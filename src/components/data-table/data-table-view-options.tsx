"use client";

import * as React from "react";

import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { Table } from "@tanstack/react-table";
import { Check, GripVertical, Lock, RotateCcw, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useStaffRole } from "@/hooks/use-staff-role";
import { moverColumna, puedeOcultar, type MetaColumna } from "@/lib/formato-de-tablas";
import { cn } from "@/lib/utils";

/**
 * LISTA DE «VISTA» — ocultar/mostrar y REORDENAR columnas arrastrando
 * (norma «formato de tablas», punto 1).
 *
 * Antes era una lista de casillas y nada más: el orden de las columnas se
 * guardaba en el estado de la tabla pero ningún componente lo cambiaba, así que
 * en la práctica no se podía reordenar. Ahora se arrastra aquí, y también en la
 * propia cabecera de la tabla: los dos sitios, como pidió Hamlet.
 *
 * El arrastre va con HTML nativo (draggable + dragover) y no con dnd-kit, que ya
 * está en el proyecto: dentro de un menú de Radix, dnd-kit pelea con el gestor de
 * foco del menú y el elemento se queda pegado al puntero. Para una lista corta y
 * vertical el arrastre nativo hace el trabajo sin esa pelea.
 */
interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
  const rol = useStaffRole();
  const [arrastrando, setArrastrando] = React.useState<string | null>(null);
  const [encima, setEncima] = React.useState<string | null>(null);

  // Solo columnas de datos: la casilla de selección y la de acciones no se
  // ocultan ni se mueven, y ofrecerlas aquí sería ofrecer algo que no funciona.
  const columnas = table
    .getAllColumns()
    .filter((c) => typeof c.accessorFn !== "undefined" && c.id !== "select" && c.id !== "actions");

  const orden = table.getState().columnOrder;
  const ids = orden.length ? orden.filter((id) => columnas.some((c) => c.id === id)) : columnas.map((c) => c.id);
  const idsCompletos = [...ids, ...columnas.map((c) => c.id).filter((id) => !ids.includes(id))];

  const soltar = (destino: string) => {
    if (!arrastrando) return;
    table.setColumnOrder(moverColumna(idsCompletos, arrastrando, destino));
    setArrastrando(null);
    setEncima(null);
  };

  const restablecer = () => {
    table.setColumnOrder([]);
    table.resetColumnVisibility();
    table.resetColumnSizing();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
          <Settings2 />
          Vista
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Columnas</span>
          <span className="text-muted-foreground text-xs font-normal">arrastra para ordenar</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-80 overflow-y-auto py-1">
          {idsCompletos.map((id) => {
            const columna = columnas.find((c) => c.id === id);
            if (!columna) return null;
            const meta = columna.columnDef.meta as MetaColumna | undefined;
            const ocultable = puedeOcultar(meta, rol);
            const visible = columna.getIsVisible();

            return (
              <div
                key={id}
                draggable
                onDragStart={() => setArrastrando(id)}
                onDragEnd={() => {
                  setArrastrando(null);
                  setEncima(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (arrastrando && arrastrando !== id) setEncima(id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  soltar(id);
                }}
                className={cn(
                  "flex cursor-grab items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none",
                  "hover:bg-accent",
                  arrastrando === id && "opacity-40",
                  encima === id && "border-primary border-t-2",
                )}
              >
                <GripVertical className="text-muted-foreground size-3.5 shrink-0" />

                <button
                  type="button"
                  disabled={!ocultable}
                  onClick={() => ocultable && columna.toggleVisibility(!visible)}
                  className={cn(
                    "flex flex-1 items-center gap-2 text-left",
                    !ocultable && "cursor-not-allowed opacity-70",
                  )}
                >
                  <Check className={cn("size-3.5 shrink-0", visible ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{meta?.label ?? id}</span>
                </button>

                {/* La obligatoria se enseña DESHABILITADA, no se esconde de la
                    lista: si desaparece, quien la busca cree que se ha roto algo. */}
                {!ocultable && (
                  <span title="Columna obligatoria para tu rol">
                    <Lock className="text-muted-foreground size-3 shrink-0" />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <DropdownMenuSeparator />
        <button
          type="button"
          onClick={restablecer}
          className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
        >
          <RotateCcw className="size-3.5" />
          Restablecer vista
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
