"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Eye, Power } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Curso } from "./schema";

function formatCursoDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

// Pastillas de estado con la paleta de marca (verde #2F855A, naranja #FF690B,
// lavanda #EBEAF2/índigo para neutro).
const getStatusBadge = (status: string) => {
  switch (status) {
    case "Activo":
      return <Badge className="border-0 bg-[#E3EFE8] text-[#2F855A] hover:bg-[#E3EFE8]">{status}</Badge>;
    case "Inactivo":
      return <Badge className="border-0 bg-[#E8D8DE] text-[#9F4E63] hover:bg-[#E8D8DE]">{status}</Badge>;
    case "En Desarrollo":
      return <Badge className="border-0 bg-[#FFF0E7] text-[#FF690B] hover:bg-[#FFF0E7]">{status}</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getLevelBadge = (level: string) => {
  switch (level) {
    case "Principiante":
      return (
        <Badge variant="outline" className="border-[#C2C0FC] text-[#363C98]">
          {level}
        </Badge>
      );
    case "Intermedio":
      return (
        <Badge variant="outline" className="border-[#FFB489] text-[#FF690B]">
          {level}
        </Badge>
      );
    case "Avanzado":
      return (
        <Badge variant="outline" className="border-[#E8D8DE] text-[#9F4E63]">
          {level}
        </Badge>
      );
    default:
      return <Badge variant="outline">{level}</Badge>;
  }
};

export const cursosColumns: ColumnDef<Curso>[] = [
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre del Curso" />,
    meta: { label: "Nombre del curso" },
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.name}</span>
        <span className="text-muted-foreground line-clamp-1 text-xs">{row.original.description}</span>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "instructor",
    meta: { label: "Instructor" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Instructor" />,
    cell: ({ row }) => <span className="text-sm">{row.original.instructor}</span>,
  },
  {
    accessorKey: "category",
    meta: { label: "Categoría" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Categoría" />,
    cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "level",
    meta: { label: "Nivel" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nivel" />,
    cell: ({ row }) => getLevelBadge(row.original.level),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    meta: { label: "Estado" },
    cell: ({ row }) => getStatusBadge(row.original.status),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "students",
    meta: { label: "Estudiantes" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estudiantes" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <span className="font-medium tabular-nums">{row.original.students}</span>
      </div>
    ),
  },
  {
    accessorKey: "price",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Precio" />,
    meta: { label: "Precio" },
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {row.original.currency}
        {row.original.price.toFixed(2)}
      </span>
    ),
  },
  {
    accessorKey: "duration",
    meta: { label: "Duración" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Duración" />,
    cell: ({ row }) => <span className="text-muted-foreground text-sm">{row.original.duration}</span>,
  },
  {
    accessorKey: "createdAt",
    meta: { label: "Fecha" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    accessorFn: (row) => row.createdAt ?? "",
    cell: ({ row }) => <span className="text-muted-foreground text-sm">{formatCursoDate(row.original.createdAt)}</span>,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const curso = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(curso.id)}>
              Copiar ID del curso
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              Ver detalles
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Pencil className="mr-2 h-4 w-4" />
              Editar curso
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Power className="mr-2 h-4 w-4" />
              {curso.status === "Activo" ? "Desactivar" : "Activar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar curso
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
