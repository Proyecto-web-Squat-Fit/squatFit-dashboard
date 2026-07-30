"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Eye, Mail, PackagePlus } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

import { AlumnoUI } from "./schema";

const getStatusBadge = (status: string | null | undefined) => {
  if (!status) {
    return <Badge variant="secondary">Sin estado</Badge>;
  }

  switch (status.toLowerCase()) {
    case "active":
    case "activo":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Activo</Badge>;
    case "inactive":
    case "inactivo":
      return (
        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
          Inactivo
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getRoleBadge = (role: string | null | undefined) => {
  if (!role) {
    return <Badge variant="outline">Sin rol</Badge>;
  }

  switch (role.toLowerCase()) {
    case "user":
      return (
        <Badge
          className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
          variant="outline"
        >
          Usuario
        </Badge>
      );
    case "admin":
      return (
        <Badge className="border-purple-200 bg-purple-50 text-purple-700" variant="outline">
          Admin
        </Badge>
      );
    case "coach":
      return (
        <Badge className="border-orange-200 bg-orange-50 text-orange-700" variant="outline">
          Coach
        </Badge>
      );
    default:
      return <Badge variant="outline">{role}</Badge>;
  }
};

const getInitials = (firstName: string | null, lastName: string | null) => {
  const first = firstName?.charAt(0) ?? "";
  const last = lastName?.charAt(0) ?? "";
  return `${first}${last}`.toUpperCase() || "??";
};

// ============================================================================
// TIPOS PARA HANDLERS
// ============================================================================

interface ColumnHandlers {
  onEdit?: (alumno: AlumnoUI) => void;
  onDelete?: (alumno: AlumnoUI) => void;
  onViewProfile?: (alumno: AlumnoUI) => void;
  onGrantProduct?: (alumno: AlumnoUI) => void;
}

// ============================================================================
// FUNCIÓN PARA GENERAR COLUMNAS CON HANDLERS
// ============================================================================

export const getAlumnosColumns = (handlers: ColumnHandlers = {}): ColumnDef<AlumnoUI>[] => [
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
    accessorKey: "fullName",
    meta: { label: "Alumno", obligatoriaPara: ["adviser", "support", "trainer", "nutritionist"] },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Alumno" />,
    cell: ({ row }) => {
      const initials = getInitials(row.original.firstName, row.original.lastName);
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-blue-100 font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{row.original.fullName}</span>
            <span className="text-muted-foreground text-xs">{row.original.email}</span>
          </div>
        </div>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: "username",
    meta: { label: "Usuario" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Usuario" />,
    cell: ({ row }) => <span className="font-mono text-sm">@{row.original.username}</span>,
  },
  {
    accessorKey: "birth",
    meta: { label: "Fecha de nacimiento" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha de Nacimiento" />,
    cell: ({ row }) => {
      if (!row.original.birth) {
        return <span className="text-muted-foreground text-sm">No especificado</span>;
      }
      try {
        const date = new Date(row.original.birth);
        return (
          <span className="text-sm">
            {date.toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </span>
        );
      } catch {
        return <span className="text-muted-foreground text-sm">Fecha inválida</span>;
      }
    },
  },
  {
    accessorKey: "role",
    meta: { label: "Rol" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Rol" />,
    cell: ({ row }) => getRoleBadge(row.original.role),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "status",
    meta: { label: "Estado", obligatoriaPara: ["adviser", "support", "trainer", "nutritionist"] },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => getStatusBadge(row.original.status),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const alumno = row.original;

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
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(alumno.id)}>
              Copiar ID del alumno
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handlers.onViewProfile?.(alumno)}>
              <Eye className="mr-2 h-4 w-4" />
              Ver perfil completo
            </DropdownMenuItem>
            {/* «Ver actividad» estaba aquí sin `onClick`: se podía pulsar y no
                pasaba nada. Un botón que no hace nada es peor que no tenerlo —
                quien lo pulsa cree que la pantalla está rota. Se quita hasta que
                exista la vista de actividad; «Ver perfil completo», que sí
                funciona, ya lleva a la ficha con todo su historial. */}
            {alumno.email && (
              <DropdownMenuItem onClick={() => window.open(`mailto:${alumno.email}`, "_blank")}>
                <Mail className="mr-2 h-4 w-4" />
                Enviar email
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handlers.onEdit?.(alumno)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar información
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlers.onGrantProduct?.(alumno)}>
              <PackagePlus className="mr-2 h-4 w-4" />
              Añadir producto
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={() => handlers.onDelete?.(alumno)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar alumno
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
