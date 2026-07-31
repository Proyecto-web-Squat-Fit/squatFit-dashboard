"use client";

import { useState, useMemo, useCallback } from "react";

import { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { useVersions } from "@/hooks/use-versions";
import type { VersionApi } from "@/lib/services/libros-service";

import { getVersionsColumns } from "./columns.versions";
import { CreateVersionModal } from "./create-version-modal";
import { DeleteVersionDialog } from "./delete-version-dialog";
import { EditVersionModal } from "./edit-version-modal";
import { Libro } from "./schema";
import { UpdateVersionPdfModal } from "./update-version-pdf-modal";

/** Marco de la zona de contenido: el mismo para el cargando, el vacío y la tabla. */
const MARCO = "min-h-[200px] flex-1 overflow-auto rounded-lg border";

interface BookVersionsModalProps {
  libro: Libro | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookVersionsModal({ libro, open, onOpenChange }: BookVersionsModalProps) {
  const bookId = libro?.id ?? "";
  const { data: versions = [], isLoading, refetch } = useVersions(bookId);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<VersionApi | null>(null);

  const handleEdit = useCallback((v: VersionApi) => {
    setSelectedVersion(v);
    setIsEditOpen(true);
  }, []);

  const handleReplacePdf = useCallback((v: VersionApi) => {
    setSelectedVersion(v);
    setIsPdfOpen(true);
  }, []);

  const handleDelete = useCallback((v: VersionApi) => {
    setSelectedVersion(v);
    setIsDeleteOpen(true);
  }, []);

  const onSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  const columns = useMemo<ColumnDef<VersionApi>[]>(
    () => getVersionsColumns(handleEdit, handleReplacePdf, handleDelete),
    [handleEdit, handleReplacePdf, handleDelete],
  );

  const table = useDataTableInstance({
    data: versions,
    columns,
    getRowId: (row) => row.id,
    enableRowSelection: false,
    defaultPageSize: 5,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        {/* sm:max-w-3xl y no max-w-3xl: DialogContent trae `sm:max-w-lg` de base y,
            al ir con prefijo, ganaba a la anchura declarada aquí — el modal salía
            a 512 px y la barra de paginación no cabía. */}
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Versiones de &quot;{libro?.title ?? ""}&quot;</DialogTitle>
            <DialogDescription>
              Gestiona las versiones del libro. Cada versión tiene su propio precio y PDF. El libro no aparece en el
              catálogo hasta tener al menos una versión.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="flex justify-end">
              <Button size="sm" className="gap-2" onClick={() => setIsCreateOpen(true)} disabled={!bookId}>
                <Plus className="h-4 w-4" />
                Nueva versión
              </Button>
            </div>
            {isLoading ? (
              <div className={MARCO}>
                <div className="flex h-[200px] items-center justify-center">
                  <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                </div>
              </div>
            ) : versions.length === 0 ? (
              <div className={MARCO}>
                <div className="text-muted-foreground flex h-[200px] flex-col items-center justify-center gap-2 text-center">
                  <p>No hay versiones. Crea la primera versión para que el libro aparezca en el catálogo.</p>
                  <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                    Nueva versión
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className={MARCO}>
                  <DataTable table={table} columns={columns} />
                </div>
                {/* Paginación: la tabla arranca con 5 filas por página, así que sin
                    esto la sexta versión y siguientes no se podían alcanzar. */}
                <DataTablePagination table={table} />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateVersionModal
        bookId={bookId}
        bookTitle={libro?.title ?? ""}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={onSuccess}
      />
      <EditVersionModal
        version={selectedVersion}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={onSuccess}
      />
      <DeleteVersionDialog
        version={selectedVersion}
        bookId={bookId}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onSuccess={onSuccess}
      />
      <UpdateVersionPdfModal
        version={selectedVersion}
        open={isPdfOpen}
        onOpenChange={setIsPdfOpen}
        onSuccess={onSuccess}
      />
    </>
  );
}
