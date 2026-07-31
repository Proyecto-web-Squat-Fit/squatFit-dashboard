import { Table } from "@tanstack/react-table";
import { ChevronRight, ChevronsRight, ChevronLeft, ChevronsLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

/** Tamaños de página que se ofrecen en todas las tablas del back office. */
const TAMANOS_DE_PAGINA = [10, 20, 30, 40, 50];

/**
 * Opciones del selector, garantizando que estén el tamaño vigente y el propio
 * de la tabla.
 *
 * El `<Select>` de Radix pinta el disparador vacío cuando su `value` no casa con
 * ningún `<SelectItem>` —no cae al `placeholder`, que solo sale sin valor—, así
 * que una tabla con `defaultPageSize` fuera de la lista (Leads pide 25) dejaba
 * el hueco «Filas por página» en blanco. En vez de recortar el tamaño al de la
 * lista, se añaden los que use la tabla: cada tabla ve su número y las demás
 * siguen viendo las cinco opciones de siempre. El tamaño por defecto se cuela
 * aunque no sea el vigente para que se pueda volver a él tras probar otro.
 */
const opcionesPara = (tamanos: (number | undefined)[]): number[] => {
  const extra = tamanos.filter((t): t is number => typeof t === "number" && !TAMANOS_DE_PAGINA.includes(t));
  if (extra.length === 0) return TAMANOS_DE_PAGINA;
  return [...new Set([...TAMANOS_DE_PAGINA, ...extra])].sort((a, b) => a - b);
};

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  const tamanoDePagina = table.getState().pagination.pageSize;
  const tamanoPorDefecto = (table.options.meta as { defaultPageSize?: number } | undefined)?.defaultPageSize;

  return (
    <div className="flex items-center justify-between px-4">
      <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
        {table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length} fila(s)
        seleccionada(s).
      </div>
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            Filas por página
          </Label>
          <Select
            value={`${tamanoDePagina}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue placeholder={tamanoDePagina} />
            </SelectTrigger>
            <SelectContent side="top">
              {opcionesPara([tamanoDePagina, tamanoPorDefecto]).map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
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
