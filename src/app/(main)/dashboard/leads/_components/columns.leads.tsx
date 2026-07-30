"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { BadgeCheck, Eye, MoreHorizontal, Pencil, Trash2, UserPlus } from "lucide-react";

import { CeldaEditable } from "@/components/data-table/celda-editable";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
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
import type { MetaColumna } from "@/lib/formato-de-tablas";
import {
  OPCIONES_CLOSER,
  OPCIONES_LLAMADA,
  OPCIONES_LLAMADA_COMPLETAS,
  OPCIONES_ORIGEN,
  OPCIONES_RESULTADO,
  OPCIONES_SEGUIMIENTO,
  OPCIONES_SETTER,
} from "@/lib/opciones-crm";
import type { Lead, UpdateLeadInput } from "@/lib/services/leads-service";

/**
 * COLUMNAS DEL CRM DE LEADS — norma «formato de tablas» (30-jul-2026).
 *
 * Las seis columnas comerciales se editan EN LA PROPIA FILA con un desplegable,
 * sin abrir ningún panel. Antes esta tabla era un `<table>` a pelo con siete
 * cabeceras fijas: no se podía redimensionar, ni ocultar, ni reordenar, ni
 * editar nada; para cambiar un estado había que abrir el panel del lead.
 *
 * `obligatoriaPara` marca lo que un rol no puede ocultar. El criterio: nadie
 * debe poder quedarse sin saber DE QUIÉN es la fila ni CÓMO contactarlo, porque
 * una tabla de leads sin nombre ni teléfono no sirve para nada y quien la
 * esconda por error creerá que se han borrado los datos. El admin no tiene
 * obligatorias: puede dejar la tabla como quiera.
 */

export interface AccionesLead {
  onVer: (lead: Lead) => void;
  onEditar: (lead: Lead) => void;
  onEliminar: (lead: Lead) => void;
  onConvertir?: (lead: Lead) => void;
  /** Guarda un cambio hecho desde una celda. Debe lanzar si el servidor rechaza. */
  onGuardar: (id: string, patch: UpdateLeadInput) => Promise<unknown>;
}

const META_OBLIGATORIA: MetaColumna["obligatoriaPara"] = ["adviser", "support", "trainer", "nutritionist"];

export function construirColumnasLeads(acciones: AccionesLead): ColumnDef<Lead>[] {
  /** Envuelve el guardado de una celda para que la celda pueda revertir si falla. */
  const guardar = (lead: Lead, patch: UpdateLeadInput) => acciones.onGuardar(lead.id, patch);

  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Seleccionar todo"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 36,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      meta: { label: "Nombre", obligatoriaPara: META_OBLIGATORIA } satisfies MetaColumna,
      size: 200,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-medium">{row.original.name}</span>
          {row.original.is_customer && (
            <span title="Ya es cliente">
              <BadgeCheck className="size-3.5 shrink-0 text-green-600" />
            </span>
          )}
        </div>
      ),
    },
    {
      id: "contacto",
      accessorFn: (l) => l.phone ?? l.email ?? "",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Contacto" />,
      meta: { label: "Contacto", obligatoriaPara: META_OBLIGATORIA } satisfies MetaColumna,
      size: 190,
      cell: ({ row }) => (
        <div className="min-w-0 text-xs">
          {row.original.phone && <div className="truncate">{row.original.phone}</div>}
          {row.original.email && <div className="text-muted-foreground truncate">{row.original.email}</div>}
          {!row.original.phone && !row.original.email && <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    // ── Las seis columnas comerciales, todas editables en la fila ────────────
    {
      accessorKey: "state",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Llamada" />,
      meta: { label: "Llamada" } satisfies MetaColumna,
      size: 140,
      cell: ({ row }) => (
        <CeldaEditable
          valor={estadoApi(row.original.state)}
          // Se pintan los ocho estados posibles pero solo se OFRECEN los tres de
          // la hoja: si un lead está en «ganado», la píldora tiene que decirlo
          // aunque ese valor no se elija desde aquí.
          opciones={OPCIONES_LLAMADA_COMPLETAS.filter(
            (o) => OPCIONES_LLAMADA.some((v) => v.valor === o.valor) || o.valor === estadoApi(row.original.state),
          )}
          permiteVaciar={false}
          onGuardar={(v) => guardar(row.original, { state: estadoUi(v) })}
        />
      ),
    },
    {
      accessorKey: "follow_up",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Seguimiento" />,
      meta: { label: "Seguimiento" } satisfies MetaColumna,
      size: 130,
      cell: ({ row }) => (
        <CeldaEditable
          valor={row.original.follow_up}
          opciones={OPCIONES_SEGUIMIENTO}
          vacio="Sin fijar"
          onGuardar={(v) => guardar(row.original, { follow_up: v })}
        />
      ),
    },
    {
      accessorKey: "setter",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Setter" />,
      meta: { label: "Setter" } satisfies MetaColumna,
      size: 120,
      cell: ({ row }) => (
        <CeldaEditable
          valor={row.original.setter}
          opciones={OPCIONES_SETTER}
          vacio="Sin asignar"
          onGuardar={(v) => guardar(row.original, { setter: v })}
        />
      ),
    },
    {
      accessorKey: "closer",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Closer" />,
      meta: { label: "Closer" } satisfies MetaColumna,
      size: 120,
      cell: ({ row }) => (
        <CeldaEditable
          valor={row.original.closer}
          opciones={OPCIONES_CLOSER}
          vacio="Sin asignar"
          onGuardar={(v) => guardar(row.original, { closer: v })}
        />
      ),
    },
    {
      accessorKey: "call_result",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Resultado" />,
      meta: { label: "Resultado" } satisfies MetaColumna,
      size: 170,
      cell: ({ row }) => (
        <CeldaEditable
          valor={row.original.call_result}
          opciones={OPCIONES_RESULTADO}
          vacio="Sin resultado"
          onGuardar={(v) => guardar(row.original, { call_result: v })}
        />
      ),
    },
    {
      accessorKey: "origin_detail",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Origen" />,
      meta: { label: "Origen" } satisfies MetaColumna,
      size: 150,
      cell: ({ row }) => (
        <CeldaEditable
          valor={row.original.origin_detail}
          opciones={OPCIONES_ORIGEN}
          vacio="Sin origen"
          onGuardar={(v) => guardar(row.original, { origin_detail: v })}
        />
      ),
    },
    {
      accessorKey: "intake_date",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Alta" />,
      meta: { label: "Alta" } satisfies MetaColumna,
      size: 100,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.original.intake_date ? new Date(row.original.intake_date).toLocaleDateString("es-ES") : "—"}
        </span>
      ),
    },
    // ── Acciones ────────────────────────────────────────────────────────────
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: 48,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label={`Acciones de ${row.original.name}`}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="truncate">{row.original.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => acciones.onVer(row.original)}>
              <Eye className="size-4" /> Ver
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => acciones.onEditar(row.original)}>
              <Pencil className="size-4" /> Editar
            </DropdownMenuItem>
            {acciones.onConvertir && !row.original.is_customer && (
              <DropdownMenuItem onSelect={() => acciones.onConvertir?.(row.original)}>
                <UserPlus className="size-4" /> Convertir en cliente
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => acciones.onEliminar(row.original)}>
              <Trash2 className="size-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

/**
 * El front usa etiquetas en español para el estado («Agendado», «Llamada
 * hecha») y el backend los valores del enum («agendado», «realizada»). Las
 * opciones del desplegable son las del backend, así que hay que traducir en los
 * dos sentidos. El mapa completo ya existe en leads-service (`STATE_TO_API` y
 * `normalizeLeadState`), pero no está exportado; aquí solo hacen falta los que
 * ofrece esta columna.
 */
const UI_A_API: Record<string, string> = {
  Nuevo: "nuevo",
  Contactado: "contactado",
  Agendado: "agendado",
  "Llamada hecha": "realizada",
  "Esperando pago": "esperando_pago",
  Ganado: "ganado",
  Perdido: "perdido",
  Seguimiento: "seguimiento",
};
const API_A_UI: Record<string, string> = Object.fromEntries(Object.entries(UI_A_API).map(([ui, api]) => [api, ui]));

function estadoApi(estadoUi: string): string {
  return UI_A_API[estadoUi] ?? estadoUi;
}

function estadoUi(estadoApi: string | null): Lead["state"] {
  return (API_A_UI[estadoApi ?? ""] ?? "Nuevo") as Lead["state"];
}
