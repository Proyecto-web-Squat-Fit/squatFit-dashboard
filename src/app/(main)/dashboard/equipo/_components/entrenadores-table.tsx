"use client";

import { useMemo, useState } from "react";

import { Download, Search } from "lucide-react";

import { BulkActionsBar } from "@/components/data-table/bulk-actions-bar";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { EditUserModal } from "@/components/modals/edit-user-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import {
  useDeleteEntrenador,
  useEntrenadores,
  useToggleEntrenadorStatus,
  useUpdateEntrenadorRol,
} from "@/hooks/use-entrenadores";
import { exportCSV, exportPDF, exportXLSX, type ExportColumn } from "@/lib/export/table-export";

import { getEntrenadoresColumns, getEquipoRol } from "./columns.entrenadores";
import { CreateEntrenadorModal } from "./create-entrenador-modal";
import { EntrenadorUI } from "./schema";

export function EntrenadoresTable() {
  const [globalFilter, setGlobalFilter] = useState("");
  const [editingUser, setEditingUser] = useState<EntrenadorUI | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Obtener entrenadores del API
  const { data: entrenadoresData, isLoading, error } = useEntrenadores();
  const deleteEntrenador = useDeleteEntrenador();
  const toggleEntrenador = useToggleEntrenadorStatus();
  const updateRol = useUpdateEntrenadorRol();
  const [viewUser, setViewUser] = useState<EntrenadorUI | null>(null);

  // Handlers del modal de edición
  const handleEditUser = (entrenador: EntrenadorUI) => {
    setEditingUser(entrenador);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
  };

  // Handler de eliminación
  const handleDeleteUser = (entrenador: EntrenadorUI) => {
    if (confirm(`¿Estás seguro de que deseas eliminar a ${entrenador.fullName}? Esta acción no se puede deshacer.`)) {
      deleteEntrenador.mutate(entrenador.id);
    }
  };

  // Transformar datos del API a formato UI
  const entrenadores = useMemo<EntrenadorUI[]>(() => {
    if (!entrenadoresData) return [];

    return entrenadoresData.map((entrenador) => ({
      ...entrenador,
      // Asegurar que firstName y lastName nunca sean null
      firstName: entrenador.firstName || "",
      lastName: entrenador.lastName || "",
      status: entrenador.user_status === 1 ? ("Activo" as const) : ("Inactivo" as const),
      fullName: `${entrenador.firstName || ""} ${entrenador.lastName || ""}`.trim() || "Sin nombre",
      avatar: entrenador.profile_picture || undefined,
    }));
  }, [entrenadoresData]);

  // Activar/desactivar (píldora de estado y menú)
  const handleToggleStatus = (e: EntrenadorUI) => {
    toggleEntrenador.mutate({ id: e.id, status: e.status === "Activo" ? "Inactivo" : "Activo" });
  };

  // Generar columnas con handlers
  const columns = useMemo(
    () =>
      getEntrenadoresColumns({
        onEdit: handleEditUser,
        onDelete: handleDeleteUser,
        onToggleStatus: handleToggleStatus,
        onView: (e) => setViewUser(e),
        onChangeRol: (e, rol) => updateRol.mutate({ userId: e.user_id, rol }),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const table = useDataTableInstance({
    data: entrenadores,
    columns,
    persistKey: "equipo",
    enableColumnResizing: true,
    getRowId: (row) => row.id,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  const selected = table.getSelectedRowModel().rows.map((r) => r.original);

  const EXPORT_COLUMNS: ExportColumn<EntrenadorUI>[] = [
    { key: "fullName", label: "Nombre" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Teléfono" },
    { key: "status", label: "Estado" },
  ];

  const doExport = (fmt: "csv" | "xlsx" | "pdf") => {
    const rows = selected.length ? selected : entrenadores;
    const name = `equipo-${rows.length}`;
    if (fmt === "csv") exportCSV(name, EXPORT_COLUMNS, rows);
    else if (fmt === "xlsx") void exportXLSX(name, EXPORT_COLUMNS, rows);
    else void exportPDF(name, EXPORT_COLUMNS, rows, "Equipo");
  };

  const handleBulkAction = (action: string) => {
    if (action === "eliminar") {
      if (confirm(`¿Eliminar ${selected.length} miembro(s) del equipo? Esta acción no se puede deshacer.`)) {
        selected.forEach((e) => deleteEntrenador.mutate(e.id));
        table.resetRowSelection();
      }
    } else if (action === "exportar") {
      doExport("csv");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Gestión de Entrenadores</CardTitle>
          <CardDescription>Administra el equipo de entrenadores y profesionales</CardDescription>
        </div>
        {/* <Button className="gap-2" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo Entrenador
        </Button> */}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Acciones en lote: siempre visibles */}
        <BulkActionsBar
          selectedCount={selected.length}
          onApply={handleBulkAction}
          actions={[
            { value: "eliminar", label: "Eliminar" },
            { value: "exportar", label: "Exportar selección (CSV)" },
          ]}
        />

        {/* Barra de búsqueda y controles */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
            <Input
              placeholder="Buscar entrenadores..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="pl-8"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => doExport("csv")}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => doExport("xlsx")}>Excel (XLSX)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => doExport("pdf")}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DataTableViewOptions table={table} />
        </div>

        {/* Manejo de estados de carga y error */}
        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <p className="text-muted-foreground">Cargando entrenadores...</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-10">
            <p className="text-destructive">Error: {error.message}</p>
          </div>
        )}

        {/* Tabla */}
        {!isLoading && !error && (
          <>
            <div className="sqf-table overflow-hidden rounded-lg border">
              <DataTable table={table} columns={columns} enableColumnResize enableColumnReorder />
            </div>

            {/* Paginación */}
            <DataTablePagination table={table} />
          </>
        )}
      </CardContent>

      {/* Modal de Edición */}
      {editingUser && (
        <EditUserModal
          open={isEditModalOpen}
          onOpenChange={handleCloseEditModal}
          userId={editingUser.user_id}
          userType="coach"
          defaultValues={{
            firstName: editingUser.firstName,
            lastName: editingUser.lastName,
            email: editingUser.email,
            phone_number: editingUser.phone || undefined,
            description: editingUser.description || undefined,
            profile_picture: editingUser.profile_picture || undefined,
          }}
        />
      )}

      {/* Modal de Creación */}
      <CreateEntrenadorModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />

      {/* Ficha rápida del miembro del equipo */}
      <Dialog open={!!viewUser} onOpenChange={(o) => !o && setViewUser(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{viewUser?.fullName}</DialogTitle>
            <DialogDescription>{viewUser?.email}</DialogDescription>
          </DialogHeader>
          {viewUser && (
            <div className="grid gap-2 text-sm">
              <p>
                <span className="text-muted-foreground">Rol:</span> {getEquipoRol(viewUser)}
              </p>
              <p>
                <span className="text-muted-foreground">Teléfono:</span> {viewUser.phone || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Estado:</span> {viewUser.status}
              </p>
              <p>
                <span className="text-muted-foreground">Descripción:</span> {viewUser.description || "—"}
              </p>
              <p className="text-muted-foreground text-xs">ID: {viewUser.id}</p>
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const u = viewUser;
                    setViewUser(null);
                    handleEditUser(u);
                  }}
                >
                  Editar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
