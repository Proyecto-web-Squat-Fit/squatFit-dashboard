"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Book, FileEdit, FileUp, Trash2 } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { VersionApi } from "@/lib/services/libros-service";
import { formatearImporte } from "@/lib/formato-de-tablas";

interface VersionActionsProps {
  version: VersionApi;
  onEdit: (v: VersionApi) => void;
  onReplacePdf: (v: VersionApi) => void;
  onDelete: (v: VersionApi) => void;
}

function VersionActions({ version, onEdit, onReplacePdf, onDelete }: VersionActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menú</span>
          <FileEdit className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(version)}>
          <FileEdit className="mr-2 h-4 w-4" />
          Editar versión
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onReplacePdf(version)}>
          <FileUp className="mr-2 h-4 w-4" />
          Reemplazar PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600" onClick={() => onDelete(version)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar versión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function getVersionsColumns(
  onEdit: (v: VersionApi) => void,
  onReplacePdf: (v: VersionApi) => void,
  onDelete: (v: VersionApi) => void,
): ColumnDef<VersionApi>[] {
  return [
    {
      accessorKey: "image",
      header: "Imagen",
      cell: ({ row }) => {
        const v = row.original;
        const imgUrl = v.image;
        return (
          <div className="flex items-center justify-center">
            {imgUrl ? (
              <div className="relative h-10 w-10 overflow-hidden rounded border">
                <img src={imgUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded border">
                <Book className="text-muted-foreground size-5" />
              </div>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "title",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Título" />,
      cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
    },
    {
      accessorKey: "price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Precio" />,
      cell: ({ row }) => <span className="tabular-nums">{formatearImporte(row.original.price, "eur")}</span>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <VersionActions version={row.original} onEdit={onEdit} onReplacePdf={onReplacePdf} onDelete={onDelete} />
      ),
      enableSorting: false,
    },
  ];
}
