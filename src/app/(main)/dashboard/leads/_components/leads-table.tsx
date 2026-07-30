"use client";

import * as React from "react";

import { toast } from "sonner";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import type { Lead, UpdateLeadInput } from "@/lib/services/leads-service";

import { construirColumnasLeads } from "./columns.leads";

/**
 * TABLA DE LEADS — cumple la norma «formato de tablas» (30-jul-2026).
 *
 * Era un `<table>` a pelo con siete cabeceras fijas: sin redimensionar, sin
 * ocultar, sin reordenar y sin poder editar nada desde la fila; para cambiar un
 * estado había que abrir el panel del lead. Ahora pasa por
 * `useDataTableInstance` como Pedidos y Usuarios, así que hereda anchura
 * personalizable (ya sin mínimo), ocultar/mostrar, reordenar arrastrando —en la
 * cabecera y en la lista de «Vista»— y la vista guardada por usuario con la clave
 * `leads`.
 *
 * Los seis estados comerciales se cambian en la propia fila. El guardado
 * optimista y la vuelta atrás si el servidor rechaza viven dentro de la celda;
 * aquí solo se orquesta.
 */
interface LeadsTableProps {
  leads: Lead[];
  onOpen: (lead: Lead) => void;
  onEditar?: (lead: Lead) => void;
  onEliminar?: (lead: Lead) => Promise<unknown>;
  onConvertir?: (lead: Lead) => void;
  onGuardar: (id: string, patch: UpdateLeadInput) => Promise<unknown>;
}

export function LeadsTable({ leads, onOpen, onEditar, onEliminar, onConvertir, onGuardar }: LeadsTableProps) {
  const [aBorrar, setABorrar] = React.useState<Lead | null>(null);
  const [borrando, setBorrando] = React.useState(false);

  const columns = React.useMemo(
    () =>
      construirColumnasLeads({
        onVer: onOpen,
        // Sin formulario de edición propio, «Editar» abre la ficha del lead, que
        // es donde se edita el resto. Prometer un formulario que no existe sería
        // peor que reutilizar el que sí.
        onEditar: onEditar ?? onOpen,
        onEliminar: setABorrar,
        onConvertir,
        onGuardar,
      }),
    [onOpen, onEditar, onConvertir, onGuardar],
  );

  const table = useDataTableInstance({
    data: leads,
    columns,
    persistKey: "leads",
    enableColumnResizing: true,
    getRowId: (row) => row.id,
    defaultPageSize: 25,
  });

  const confirmarBorrado = async () => {
    if (!aBorrar || !onEliminar) return;
    setBorrando(true);
    try {
      await onEliminar(aBorrar);
      toast.success(`Lead «${aBorrar.name}» eliminado`);
      setABorrar(null);
    } catch (error) {
      toast.error("No se pudo eliminar el lead", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBorrando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end">
        <DataTableViewOptions table={table} />
      </div>

      <div className="overflow-hidden rounded-md border">
        <DataTable table={table} columns={columns} enableColumnResize enableColumnReorder />
      </div>

      <DataTablePagination table={table} />

      {/* «Eliminar» dice QUÉ se borra por su nombre (norma, punto 4): en una
          tabla de 25 filas con menús idénticos, un «¿seguro?» a secas no permite
          comprobar que el menú abierto era el de la fila que se creía. */}
      <AlertDialog open={!!aBorrar} onOpenChange={(abierto) => !abierto && setABorrar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el lead «{aBorrar?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra el lead con sus notas y su historial, y no se puede deshacer. Si ya es cliente, su cuenta no se
              toca.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={borrando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmarBorrado();
              }}
              disabled={borrando}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {borrando ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
