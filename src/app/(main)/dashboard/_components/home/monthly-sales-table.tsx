"use client";

import { useCallback, useState } from "react";

import Image from "next/image";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, CreditCard, ImageIcon, Search, ShoppingBag, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSales } from "@/hooks/use-sales";
import type { Sale, SaleStatus, SaleType, PurchaseFrom } from "@/lib/services/sales-types";
import { formatearImporte } from "@/lib/formato-de-tablas";

// ============================================================================
// CONSTANTES
// ============================================================================

const ITEMS_PER_PAGE = 10;

const MONTHS = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

// ============================================================================
// HELPERS
// ============================================================================

function getTypeBadgeClass(type: SaleType) {
  switch (type) {
    case "Curso":
      return "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border-violet-200 dark:border-violet-800";
    case "Asesoría":
      return "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800";
    case "Libro":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    default:
      return "";
  }
}

function getStatusBadge(status: SaleStatus) {
  switch (status) {
    case "completed":
      return {
        label: "Completada",
        className:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      };
    case "pending":
      return {
        label: "Pendiente",
        className:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
      };
    case "failed":
      return {
        label: "Fallida",
        className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800",
      };
    case "refunded":
      return {
        label: "Reembolsada",
        className: "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300 border-gray-200 dark:border-gray-800",
      };
    default:
      return { label: status, className: "" };
  }
}

function getPlatformLabel(platform: PurchaseFrom) {
  switch (platform) {
    case "stripe":
      return "Stripe";
    case "paypal":
      return "PayPal";
    default:
      return platform;
  }
}

// Mismo formato de importe que las tablas (punto decimal, símbolo detrás): un
// pedido de 49 € tiene que leerse igual en la portada del panel que en Pedidos.
function formatCurrency(amount: string, currency: string) {
  const num = Number.parseFloat(amount);
  if (Number.isNaN(num)) return `${amount} ${currency}`;
  return formatearImporte(num, currency || "eur");
}

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "d MMM yyyy, HH:mm", { locale: es });
  } catch {
    return dateStr;
  }
}

// ============================================================================
// SALE TABLE ROW
// ============================================================================

function MonthlySaleRow({ sale }: { sale: Sale }) {
  const statusBadge = getStatusBadge(sale.status);

  return (
    <TableRow className="group">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
            {sale.image ? (
              <Image src={sale.image} alt={sale.title} fill className="object-cover" sizes="40px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="text-muted-foreground h-4 w-4" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{sale.title}</p>
            <p className="text-muted-foreground truncate text-xs">{sale.firstName}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={getTypeBadgeClass(sale.type)}>
          {sale.type}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="font-medium tabular-nums">{formatCurrency(sale.amount_value, sale.amount_currency)}</span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <CreditCard className="text-muted-foreground h-3.5 w-3.5" />
          <span className="text-muted-foreground text-xs">{getPlatformLabel(sale.purchase_from)}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={statusBadge.className}>
          {statusBadge.label}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-right text-xs">{formatDate(sale.date)}</TableCell>
    </TableRow>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

function MonthlySalesTableSkeleton() {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-3">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 flex-1" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

/**
 * Tabla paginada de ventas del mes con filtros
 * Endpoint: GET /api/v1/admin-panel/sales?page=X&limit=Y&month=Z&search=W
 */
export function MonthlySalesTable() {
  const currentMonth = new Date().getMonth() + 1;

  const [page, setPage] = useState(1);
  const [month, setMonth] = useState<number>(currentMonth);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useSales({
    page,
    limit: ITEMS_PER_PAGE,
    month,
    search: search || undefined,
  });

  const handleSearch = useCallback(() => {
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  }, []);

  const handleMonthChange = useCallback((value: string) => {
    setMonth(Number(value));
    setPage(1);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch],
  );

  if (isLoading) {
    return <MonthlySalesTableSkeleton />;
  }

  if (isError) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Ventas del Mes</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <p className="text-destructive text-sm">Error al cargar las ventas</p>
        </CardContent>
      </Card>
    );
  }

  const selectedMonthLabel = MONTHS.find((m) => m.value === String(month))?.label ?? "";

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShoppingBag className="text-primary h-4 w-4" />
          <CardTitle className="text-base font-semibold">Ventas del Mes</CardTitle>
        </div>
        <CardDescription>
          Transacciones de {selectedMonthLabel} — {data?.length ?? 0} resultados totales
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground h-4 w-4 shrink-0" />
            <Select value={String(month)} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Seleccionar mes" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex flex-1 items-center gap-2">
            <Search className="text-muted-foreground absolute left-3 h-4 w-4" />
            <Input
              placeholder="Buscar por nombre de cliente..."
              className="pr-9 pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {searchInput && (
              <button
                onClick={handleClearSearch}
                className="text-muted-foreground hover:text-foreground absolute right-3 transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tabla */}
        {!data || data.sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="text-muted-foreground/40 mb-3 h-10 w-10" />
            <p className="text-muted-foreground text-sm">No hay ventas para {selectedMonthLabel}</p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sales.map((sale) => (
                    <MonthlySaleRow key={sale.id} sale={sale} />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">
                Página {data.page} de {data.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= (data.totalPages ?? 1)}
                >
                  Siguiente
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
