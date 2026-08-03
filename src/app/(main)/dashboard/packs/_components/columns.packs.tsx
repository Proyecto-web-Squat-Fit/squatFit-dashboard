"use client";

import { ColumnDef } from "@tanstack/react-table";

import { CeldaTexto } from "@/components/data-table/celda-texto";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatearImporte } from "@/lib/formato-de-tablas";

import type { Pack } from "./schema";

export const packsColumns: ColumnDef<Pack>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todo"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col">
        <CeldaTexto className="font-medium">{row.original.name}</CeldaTexto>
        {row.original.description && (
          <CeldaTexto apagado className="text-xs">
            {row.original.description}
          </CeldaTexto>
        )}
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "price",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Precio" />,
    // Mismo formato que el resto del panel: punto decimal y el símbolo DETRÁS
    // («80.00 €»). Aquí iba delante, así que el mismo importe se leía distinto
    // en Packs y en Pedidos.
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{formatearImporte(row.original.price, "eur")}</span>
    ),
  },
  {
    accessorKey: "versionsCount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Versiones" />,
    cell: ({ row }) => {
      const count = row.original.versionsCount ?? row.original.versions?.length ?? 0;
      return <Badge variant="outline">{count}</Badge>;
    },
  },
  {
    id: "actions",
    cell: () => null,
  },
];
