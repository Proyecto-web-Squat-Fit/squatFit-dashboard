import { Table } from "@tanstack/react-table";
import { ChevronRight, ChevronsRight, ChevronLeft, ChevronsLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

/**
 * Filas por página, norma de tablas (5-ago-2026).
 *
 * Antes eran 10/20/30/40/50: cuatro escalones para moverse entre 10 y 50, y
 * ninguno por encima. Con miles de clientes o de pedidos, revisar la tabla a 50
 * filas es paginar sin parar. Ahora los saltos son grandes de verdad y llegan a
 * 200, que es el tope que devuelve el backend por página.
 */
const TAMANOS_DE_PAGINA = [25, 50, 100, 150, 200];

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  const pageSize = table.getState().pagination.pageSize;
  // Alguna tabla arranca con un tamaño fuera de la lista estándar (el modal de
  // versiones de un libro usa 5). Se añaden el vigente y el de arranque: sin el
  // primero el selector saldría en blanco, y sin el segundo no habría manera de
  // volver al tamaño original después de cambiarlo.
  const tamanos = Array.from(new Set([...TAMANOS_DE_PAGINA, table.initialState.pagination.pageSize, pageSize])).sort(
    (a, b) => a - b,
  );
  // Sin selección de filas (modales), el recuento de seleccionadas no dice nada:
  // se muestra el total de filas, que sí sitúa al usuario dentro de la paginación.
  const seleccionable = table.options.enableRowSelection !== false;

  return (
    <div className="flex items-center justify-between px-4">
      <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
        {seleccionable
          ? `${table.getFilteredSelectedRowModel().rows.length} de ${table.getFilteredRowModel().rows.length} fila(s) seleccionada(s).`
          : `${table.getFilteredRowModel().rows.length} fila(s).`}
      </div>
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            Filas por página
          </Label>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {tamanos.map((tamano) => (
                <SelectItem key={tamano} value={`${tamano}`}>
                  {tamano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Ir a la primera página</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Ir a la página anterior</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Ir a la página siguiente</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Ir a la última página</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
