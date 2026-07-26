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
  const [pagination, setPagination] = React.useState({
    pageIndex: defaultPageIndex ?? 0,
    pageSize: defaultPageSize ?? 10,
  });

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
