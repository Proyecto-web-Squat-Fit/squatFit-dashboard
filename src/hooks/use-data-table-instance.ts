import * as React from "react";

import {
  ColumnDef,
  ColumnFiltersState,
  ColumnSizingState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { getCurrentUser } from "@/lib/auth/auth-utils";
import { ANCHURA_MINIMA, ANCHURA_POR_DEFECTO } from "@/lib/formato-de-tablas";

type UseDataTableInstanceProps<TData, TValue> = {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  enableRowSelection?: boolean;
  /** Habilita redimensionar columnas (arrastrar el borde de la cabecera). */
  enableColumnResizing?: boolean;
  /**
   * Si se indica, la anchura, el orden y la visibilidad de las columnas se
   * guardan en el perfil del usuario (localStorage por usuario) con esta clave,
   * de modo que se mantienen entre recargas. Ej: "usuarios", "pedidos".
   */
  persistKey?: string;
  defaultPageIndex?: number;
  defaultPageSize?: number;
  getRowId?: (row: TData, index: number) => string;
  state?: {
    globalFilter?: string;
  };
  onGlobalFilterChange?: (value: string) => void;
};

type PersistedTableState = {
  columnVisibility?: VisibilityState;
  columnOrder?: string[];
  columnSizing?: ColumnSizingState;
};

const storageKeyFor = (persistKey: string): string => {
  let userId = "anon";
  try {
    const user = getCurrentUser();
    if (user?.sub) userId = String(user.sub);
  } catch {
    // sin sesión legible: se usa "anon" (igualmente sirve en el mismo navegador)
  }
  return `sqf-table-prefs:${persistKey}:${userId}`;
};

const loadPrefs = (persistKey?: string): PersistedTableState => {
  if (!persistKey || typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKeyFor(persistKey));
    return raw ? (JSON.parse(raw) as PersistedTableState) : {};
  } catch {
    return {};
  }
};

export function useDataTableInstance<TData, TValue>({
  data,
  columns,
  enableRowSelection = true,
  enableColumnResizing = false,
  persistKey,
  defaultPageIndex,
  defaultPageSize,
  getRowId,
  state: externalState,
  onGlobalFilterChange,
}: UseDataTableInstanceProps<TData, TValue>) {
  // Preferencias guardadas (una sola lectura al montar).
  const initialPrefs = React.useMemo(() => loadPrefs(persistKey), [persistKey]);

  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialPrefs.columnVisibility ?? {});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = React.useState<string[]>(initialPrefs.columnOrder ?? []);
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>(initialPrefs.columnSizing ?? {});
  const paginacionInicial = { pageIndex: defaultPageIndex ?? 0, pageSize: defaultPageSize ?? 10 };
  const [pagination, setPagination] = React.useState(paginacionInicial);

  // Guardar en el perfil (localStorage) cuando cambian anchura/orden/visibilidad.
  React.useEffect(() => {
    if (!persistKey || typeof window === "undefined") return;
    try {
      const payload: PersistedTableState = { columnVisibility, columnOrder, columnSizing };
      window.localStorage.setItem(storageKeyFor(persistKey), JSON.stringify(payload));
    } catch {
      // cuota llena o modo privado: se ignora, no es crítico
    }
  }, [persistKey, columnVisibility, columnOrder, columnSizing]);

  const table = useReactTable({
    data,
    columns,
    columnResizeMode: "onChange",
    enableColumnResizing,
    // SIN anchura mínima (norma «formato de tablas», punto 1). TanStack usa
    // minSize 20 por defecto y eso impedía estrechar más allá de ahí, que era
    // justo lo que molestaba. Se deja en 1 y no en 0: con 0 el navegador colapsa
    // la celda a nada y la manija de arrastre deja de poder cogerse, así que la
    // columna quedaría inrecuperable.
    defaultColumn: {
      minSize: ANCHURA_MINIMA,
      size: ANCHURA_POR_DEFECTO,
    },
    // `persistKey` viaja en la meta de la tabla para que la lista de «Vista»
    // sepa qué vista está guardando sin tener que pasárselo por props desde los
    // seis sitios que ya montan una tabla.
    meta: { persistKey },
    // La paginación va controlada, pero el estado inicial se declara igualmente
    // para que `table.initialState` conserve el tamaño de página de arranque:
    // es lo que mira el selector de «Filas por página» para ofrecerlo.
    initialState: { pagination: paginacionInicial },
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      columnOrder,
      columnSizing,
      pagination,
      globalFilter: externalState?.globalFilter,
    },
    onGlobalFilterChange,
    enableRowSelection,
    getRowId: getRowId ?? ((row) => (row as any).id.toString()),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return table;
}
