"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2, Eye, Power, Mail, Phone } from "lucide-react";

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

/** Roles formales del staff (Doc 0 cap. 1.1), editables desde la píldora Rol. */
export const STAFF_ROLES = ["Nutri", "Trainer", "Psicóloga", "Soporte", "Ventas", "Admin"] as const;

/**
 * Rol del miembro del equipo: primero el campo formal `staff_role` (BD) y,
 * si aún no está asignado, se deriva de la descripción como hasta ahora.
 */
export const getEquipoRol = (e: EntrenadorUI): string => {
  if (e.staff_role) return e.staff_role;
  const d = (e.description || "").toLowerCase();
  if (/nutri|dietista|dieta/.test(d)) return "Nutri";
  if (/trainer|entrena|entreno/.test(d)) return "Trainer";
  if (/psic/.test(d)) return "Psicóloga";
  if (/venta|closer|setter/.test(d)) return "Ventas";
  if (/soporte|support/.test(d)) return "Soporte";
  return "Preparador";
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
  onChangeRol?: (entrenador: EntrenadorUI, rol: string) => void;
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
    meta: { label: "Nombre" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Entrenador" />,
    cell: ({ row }) => {
      const initials = getInitials(row.original.firstName, row.original.lastName);
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {row.original.avatar && <AvatarImage src={row.original.avatar} />}
            <AvatarFallback className="bg-orange-100 font-semibold text-orange-700">{initials}</AvatarFallback>
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
    accessorKey: "phone",
    meta: { label: "Teléfono" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Teléfono" />,
    cell: ({ row }) => <span className="text-sm">{row.original.phone || "No disponible"}</span>,
  },
  {
    accessorKey: "description",
    meta: { label: "Descripción" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Descripción" />,
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate">
        <span className="text-muted-foreground text-sm">{row.original.description || "Sin descripción"}</span>
      </div>
    ),
  },
  {
    id: "rol",
    meta: { label: "Rol" },
    header: "Rol",
    size: 130,
    cell: ({ row }) => {
      const current = getEquipoRol(row.original);
      return (
        <EditablePill
          options={STAFF_ROLES.map((r) => ({ value: r, label: r }))}
          onSelect={(v) => {
            if (v !== row.original.staff_role) handlers.onChangeRol?.(row.original, v);
          }}
        >
          <Badge variant="outline" className="sqf-badge-indigo">
            {current}
          </Badge>
        </EditablePill>
      );
    },
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
                Copiar ID del entrenador
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
                Eliminar entrenador
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
