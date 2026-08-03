"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Eye, Power, Mail, Phone } from "lucide-react";

import { CeldaEditableMultiple } from "@/components/data-table/celda-editable-multiple";
import { CeldaTexto } from "@/components/data-table/celda-texto";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { EditablePill } from "@/components/ui/editable-pill";
import { OPCIONES_ROL_EMPLEADO, rolesDeEmpleado, type RolEmpleado } from "@/lib/roles-empleado";

import { EntrenadorUI } from "./schema";

// Estado con la paleta de marca: verde #2F855A (activo) y vino #9F4E63 (inactivo)
const getStatusBadge = (status: string) => {
  switch (status) {
    case "Activo":
      return (
        <Badge variant="outline" className="sqf-badge-green">
          {status}
        </Badge>
      );
    case "Inactivo":
      return (
        <Badge variant="outline" className="sqf-badge-wine">
          {status}
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getInitials = (firstName: string, lastName: string) => {
  const first = firstName?.charAt(0) || "";
  const last = lastName?.charAt(0) || "";
  return `${first}${last}`.toUpperCase() || "??";
};

// ============================================================================
// TIPOS PARA HANDLERS
// ============================================================================

interface ColumnHandlers {
  onEdit?: (entrenador: EntrenadorUI) => void;
  onDelete?: (entrenador: EntrenadorUI) => void;
  onToggleStatus?: (entrenador: EntrenadorUI) => void;
  onView?: (entrenador: EntrenadorUI) => void;
  /** Recibe la lista COMPLETA de roles, no el que se acaba de tocar. */
  onChangeRoles?: (entrenador: EntrenadorUI, roles: RolEmpleado[]) => Promise<unknown>;
}

// ============================================================================
// FUNCIÓN PARA GENERAR COLUMNAS CON HANDLERS
// ============================================================================

export const getEntrenadoresColumns = (handlers: ColumnHandlers = {}): ColumnDef<EntrenadorUI>[] => [
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
    meta: { label: "Nombre", obligatoriaPara: ["adviser", "support", "trainer", "nutritionist"] },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Empleado" />,
    cell: ({ row }) => {
      const initials = getInitials(row.original.firstName, row.original.lastName);
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {row.original.avatar && <AvatarImage src={row.original.avatar} />}
            <AvatarFallback className="bg-orange-100 font-semibold text-orange-700">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <CeldaTexto className="font-medium">{row.original.fullName}</CeldaTexto>
            <CeldaTexto apagado className="text-xs">
              {row.original.email}
            </CeldaTexto>
          </div>
        </div>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: "phone",
    meta: { label: "Teléfono" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Teléfono" />,
    cell: ({ row }) => <CeldaTexto className="text-sm">{row.original.phone || "No disponible"}</CeldaTexto>,
  },
  {
    accessorKey: "description",
    meta: { label: "Descripción" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
    cell: ({ row }) => (
      <CeldaTexto apagado className="text-sm">
        {row.original.description || "Sin descripción"}
      </CeldaTexto>
    ),
  },
  {
    id: "rol",
    meta: { label: "Rol" },
    header: "Rol",
    size: 190,
    // Selección MÚLTIPLE: una misma persona puede ser Trainer y Nutri a la vez,
    // y hasta ahora elegir uno borraba el otro.
    cell: ({ row }) => (
      <CeldaEditableMultiple
        valores={rolesDeEmpleado(row.original)}
        opciones={OPCIONES_ROL_EMPLEADO}
        vacio="Sin rol"
        onGuardar={(roles) => handlers.onChangeRoles?.(row.original, roles as RolEmpleado[]) ?? Promise.resolve()}
      />
    ),
  },
  {
    accessorKey: "status",
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => (
      <EditablePill
        options={[
          { value: "Activo", label: "Activo" },
          { value: "Inactivo", label: "Inactivo" },
        ]}
        onSelect={(v) => {
          if (v !== row.original.status) handlers.onToggleStatus?.(row.original);
        }}
      >
        {getStatusBadge(row.original.status)}
      </EditablePill>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const entrenador = row.original;

      return (
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 hover:bg-[#EBEAF2]"
            title="Ver ficha"
            onClick={() => handlers.onView?.(entrenador)}
          >
            <Eye className="h-4 w-4 text-[#363C98]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 hover:bg-[#EBEAF2]"
            title="Editar"
            onClick={() => handlers.onEdit?.(entrenador)}
          >
            <Pencil className="h-4 w-4 text-[#363C98]" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(entrenador.id)}>
                Copiar ID del empleado
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handlers.onView?.(entrenador)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver perfil completo
              </DropdownMenuItem>
              {entrenador.email && (
                <DropdownMenuItem onClick={() => window.open(`mailto:${entrenador.email}`, "_blank")}>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar email
                </DropdownMenuItem>
              )}
              {entrenador.phone && (
                <DropdownMenuItem onClick={() => window.open(`tel:${entrenador.phone}`, "_blank")}>
                  <Phone className="mr-2 h-4 w-4" />
                  Llamar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handlers.onEdit?.(entrenador)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar información
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handlers.onToggleStatus?.(entrenador)}>
                <Power className="mr-2 h-4 w-4" />
                {entrenador.status === "Activo" ? "Desactivar" : "Activar"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => handlers.onDelete?.(entrenador)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar empleado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
