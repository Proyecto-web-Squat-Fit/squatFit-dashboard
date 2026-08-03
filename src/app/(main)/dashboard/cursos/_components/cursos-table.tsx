"use client";

import { useState, useMemo, useCallback } from "react";

import { ColumnDef } from "@tanstack/react-table";
import { Download, Eye, Pencil, Plus, Search } from "lucide-react";

import { BulkActionsBar } from "@/components/data-table/bulk-actions-bar";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditablePill } from "@/components/ui/editable-pill";
import { Input } from "@/components/ui/input";
import { useCursos, useDeleteCurso, useToggleCursoStatus, useUpdateCurso } from "@/hooks/use-cursos";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportCSV, exportPDF, exportXLSX, type ExportColumn } from "@/lib/export/table-export";

import { CursoActions } from "./columns-actions";
import { cursosColumns } from "./columns.cursos";
import { CreateCursoModal } from "./create-curso-modal";
import { DeleteCursoDialog } from "./delete-curso-dialog";
import { EditCursoModal } from "./edit-curso-modal";
import { FreeSampleStatusCell } from "./free-sample-status-cell";
import { Curso } from "./schema";
import { UploadVideoModal } from "./upload-video-modal";

export function CursosTable() {
  const { data: cursosData, isLoading, isError, error } = useCursos();
  const cursos = cursosData || [];

  const [globalFilter, setGlobalFilter] = useState("");

  // Estados de modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isUploadVideoModalOpen, setIsUploadVideoModalOpen] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<Curso | null>(null);
  const [quickView, setQuickView] = useState<Curso | null>(null);

  const toggleStatusMutation = useToggleCursoStatus();
  const deleteCursoMutation = useDeleteCurso();
  const updateCategoryMutation = useUpdateCurso();

  const handleEdit = useCallback((curso: Curso) => {
    setSelectedCurso(curso);
    setIsEditModalOpen(true);
  }, []);

  const handleDelete = useCallback((curso: Curso) => {
    setSelectedCurso(curso);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleToggleStatus = useCallback(
    (curso: Curso) => {
      const newStatus = curso.status === "Activo" ? "Inactivo" : "Activo";
      toggleStatusMutation.mutate({ id: curso.id, status: newStatus });
    },
    [toggleStatusMutation],
  );

  const handleUploadVideo = useCallback((curso: Curso) => {
    setSelectedCurso(curso);
    setIsUploadVideoModalOpen(true);
  }, []);

  /** Opciones de categoría: las del negocio + las que ya existan en los datos. */
  const categoryOptions = useMemo(() => {
    const base = ["General", "Nutrición", "Entrenamiento", "Nutrición mujer", "Perder grasa", "Ganar músculo"];
    const existing = cursos.map((c) => c.category).filter(Boolean);
    return [...new Set([...base, ...existing])];
  }, [cursos]);

  // Columnas con acciones inyectadas
  const columns = useMemo<ColumnDef<Curso>[]>(() => {
    // Se parte de las columnas base y se sustituyen Estado y Categoría por
    // versiones editables con desplegable (consistentes con el resto del panel)
    const base = cursosColumns.slice(0, -1).map((col) => {
      const key = (col as { accessorKey?: string }).accessorKey;
      if (key === "status") {
        return {
          ...col,
          cell: ({ row }: { row: { original: Curso } }) => (
            <EditablePill
              options={[
                { value: "Activo", label: "Activo" },
                { value: "Inactivo", label: "Inactivo" },
              ]}
              onSelect={(v) => toggleStatusMutation.mutate({ id: row.original.id, status: v as "Activo" | "Inactivo" })}
            >
              <Badge
                variant="outline"
                className={row.original.status === "Activo" ? "sqf-badge-green" : "sqf-badge-wine"}
              >
                {row.original.status}
              </Badge>
            </EditablePill>
          ),
        } as ColumnDef<Curso>;
      }
      if (key === "category") {
        return {
          ...col,
          cell: ({ row }: { row: { original: Curso } }) => (
            <EditablePill
              options={[
                ...categoryOptions.map((c) => ({ value: c, label: c })),
                { value: "__nueva__", label: "+ Nueva categoría..." },
              ]}
              onSelect={(v) => {
                const category = v === "__nueva__" ? window.prompt("Nombre de la nueva categoría:")?.trim() : v;
                if (category) updateCategoryMutation.mutate({ id: row.original.id, data: { category } });
              }}
            >
              <Badge variant="outline" className="sqf-badge-indigo">
                {row.original.category || "General"}
              </Badge>
            </EditablePill>
          ),
        } as ColumnDef<Curso>;
      }
      return col;
    });

    return [
      ...base,
      {
        id: "muestra_gratuita",
        // Desde el 3-ago el dato SÍ viaja en la fila: `GET course/all`
        // devuelve `free_sample_count`. Antes vivía solo en
        // `course/detail/:id` y la celda se lo pedía por su cuenta, una
        // petición por fila visible. Ahora, además de no costar nada, la
        // columna se puede ORDENAR: es útil para sacar arriba los cursos
        // que aún no tienen ninguna, que es justo lo que hay que vigilar.
        accessorFn: (row) => row.freeSampleCount ?? -1,
        size: 150,
        meta: { label: "Muestra gratuita" },
        header: () => "Muestra gratuita",
        cell: ({ row }) => <FreeSampleStatusCell count={row.original.freeSampleCount} />,
      },
      {
        id: "actions",
        size: 130,
        meta: { label: "Acciones" },
        cell: ({ row }) => (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-[#EBEAF2]"
              title="Vista rápida"
              onClick={() => setQuickView(row.original)}
            >
              <Eye className="h-4 w-4 text-[#363C98]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 hover:bg-[#EBEAF2]"
              title="Editar curso"
              onClick={() => handleEdit(row.original)}
            >
              <Pencil className="h-4 w-4 text-[#363C98]" />
            </Button>
            <CursoActions
              curso={row.original}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
              onUploadVideo={handleUploadVideo}
            />
          </div>
        ),
      },
    ];
  }, [
    handleEdit,
    handleDelete,
    handleToggleStatus,
    handleUploadVideo,
    toggleStatusMutation,
    updateCategoryMutation,
    categoryOptions,
  ]);

  const table = useDataTableInstance({
    data: cursos,
    columns,
    persistKey: "cursos",
    enableColumnResizing: true,
    getRowId: (row) => row.id,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  const selected = table.getSelectedRowModel().rows.map((r) => r.original);

  const EXPORT_COLUMNS: ExportColumn<Curso>[] = [
    { key: "name", label: "Curso" },
    { key: "instructor", label: "Instructor" },
    { key: "status", label: "Estado" },
    { key: "students", label: "Estudiantes" },
    { key: "price", label: "Precio", value: (c) => `${c.currency}${c.price.toFixed(2)}` },
    { key: "createdAt", label: "Fecha", value: (c) => c.createdAt ?? "" },
  ];

  const doExport = (fmt: "csv" | "xlsx" | "pdf") => {
    const rows = selected.length ? selected : cursos;
    const name = `cursos-${rows.length}`;
    if (fmt === "csv") exportCSV(name, EXPORT_COLUMNS, rows);
    else if (fmt === "xlsx") void exportXLSX(name, EXPORT_COLUMNS, rows);
    else void exportPDF(name, EXPORT_COLUMNS, rows, "Cursos");
  };

  const handleBulkAction = (action: string) => {
    if (action === "activar" || action === "desactivar") {
      selected.forEach((c) =>
        toggleStatusMutation.mutate({ id: c.id, status: action === "activar" ? "Activo" : "Inactivo" }),
      );
      table.resetRowSelection();
    } else if (action === "eliminar") {
      selected.forEach((c) => deleteCursoMutation.mutate(c.id));
      table.resetRowSelection();
    } else if (action === "exportar") {
      doExport("csv");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Gestión de Cursos</CardTitle>
            <CardDescription>Administra todos los cursos disponibles en la plataforma</CardDescription>
          </div>
          <Button className="gap-2" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo Curso
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Acciones en lote: siempre visibles */}
          <BulkActionsBar
            selectedCount={selected.length}
            onApply={handleBulkAction}
            actions={[
              { value: "activar", label: "Activar" },
              { value: "desactivar", label: "Desactivar" },
              { value: "eliminar", label: "Eliminar" },
              { value: "exportar", label: "Exportar selección (CSV)" },
            ]}
          />

          {/* Barra de búsqueda y controles */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
              <Input
                placeholder="Buscar cursos..."
                value={globalFilter}
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

          {/* Tabla */}
          <div className="sqf-table overflow-hidden rounded-lg border">
            {isLoading ? (
              <div className="flex h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                  <p className="text-muted-foreground text-sm">Cargando cursos...</p>
                </div>
              </div>
            ) : isError ? (
              <div className="flex h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-sm font-medium text-red-600">Error al cargar los cursos</p>
                  <p className="text-muted-foreground text-xs">
                    {error instanceof Error ? error.message : "Error desconocido"}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2">
                    Reintentar
                  </Button>
                </div>
              </div>
            ) : cursos.length === 0 ? (
              <div className="flex h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-sm font-medium">No hay cursos disponibles</p>
                  <p className="text-muted-foreground text-xs">
                    Crea tu primer curso usando el botón &quot;Nuevo Curso&quot;
                  </p>
                </div>
              </div>
            ) : (
              <DataTable table={table} columns={columns} enableColumnResize enableColumnReorder />
            )}
          </div>

          {/* Paginación - Solo mostrar si hay datos */}
          {!isLoading && !isError && cursos.length > 0 && <DataTablePagination table={table} />}
        </CardContent>
      </Card>

      {/* Modales y Dialogs */}
      <CreateCursoModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      <EditCursoModal curso={selectedCurso} open={isEditModalOpen} onOpenChange={setIsEditModalOpen} />
      <DeleteCursoDialog curso={selectedCurso} open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen} />
      <UploadVideoModal curso={selectedCurso} open={isUploadVideoModalOpen} onOpenChange={setIsUploadVideoModalOpen} />

      {/* Vista rápida del curso: todos los datos + acceso directo a editar */}
      <Dialog open={!!quickView} onOpenChange={(o) => !o && setQuickView(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {quickView?.name}
              {quickView && (
                <Badge
                  variant="outline"
                  className={quickView.status === "Activo" ? "sqf-badge-green" : "sqf-badge-wine"}
                >
                  {quickView.status}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>{quickView?.description}</DialogDescription>
          </DialogHeader>
          {quickView && (
            <div className="grid gap-2 text-sm">
              <p>
                <span className="text-muted-foreground">Instructor:</span> {quickView.instructor}
              </p>
              <p>
                <span className="text-muted-foreground">Categoría:</span> {quickView.category || "General"}
              </p>
              <p>
                <span className="text-muted-foreground">Precio:</span> {quickView.currency}
                {quickView.price.toFixed(2)}
              </p>
              <p>
                <span className="text-muted-foreground">Estudiantes:</span> {quickView.students}
              </p>
              <p>
                <span className="text-muted-foreground">Creado:</span>{" "}
                {quickView.createdAt ? new Date(quickView.createdAt).toLocaleDateString("es-ES") : "—"}
              </p>
              <p className="text-muted-foreground text-xs">ID: {quickView.id}</p>
              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    const c = quickView;
                    setQuickView(null);
                    handleEdit(c);
                  }}
                >
                  <Pencil className="h-4 w-4" /> Editar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
