"use client";

import Image from "next/image";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Activity, CreditCard, ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRecentSales } from "@/hooks/use-sales";
import type { Sale, SaleStatus, SaleType } from "@/lib/services/sales-types";
import { formatearImporte } from "@/lib/formato-de-tablas";

// ============================================================================
// HELPERS
// ============================================================================

function getTypeBadgeVariant(type: SaleType) {
  switch (type) {
    case "Curso":
      return {
        className:
          "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border-violet-200 dark:border-violet-800",
      };
    case "Asesoría":
      return {
        className: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800",
      };
    case "Libro":
      return {
        className:
          "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      };
    default:
      return { className: "" };
  }
}

function getStatusBadgeVariant(status: SaleStatus) {
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

// Mismo formato de importe que las tablas (punto decimal, símbolo detrás): un
// pedido de 49 € tiene que leerse igual en la portada del panel que en Pedidos.
function formatCurrency(amount: string, currency: string) {
  const num = Number.parseFloat(amount);
  if (Number.isNaN(num)) return `${amount} ${currency}`;
  return formatearImporte(num, currency || "eur");
}

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "d MMM yyyy", { locale: es });
  } catch {
    return dateStr;
  }
}

// ============================================================================
// SALE ROW
// ============================================================================

function SaleRow({ sale }: { sale: Sale }) {
  const typeVariant = getTypeBadgeVariant(sale.type);
  const statusVariant = getStatusBadgeVariant(sale.status);

  return (
    <TableRow className="group">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="bg-muted relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
            {sale.image ? (
              <Image src={sale.image} alt={sale.title} fill className="object-cover" sizes="36px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="text-muted-foreground h-4 w-4" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{sale.title}</p>
            <p className="text-muted-foreground text-xs">{sale.firstName}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={typeVariant.className}>
          {sale.type}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <CreditCard className="text-muted-foreground h-3.5 w-3.5" />
          <span className="font-medium tabular-nums">{formatCurrency(sale.amount_value, sale.amount_currency)}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={statusVariant.className}>
          {statusVariant.label}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-right text-xs">{formatDate(sale.date)}</TableCell>
    </TableRow>
  );
}

// ============================================================================
// SKELETON
// ============================================================================

function RecentSalesSkeleton() {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
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
 * Tabla de las últimas 5 ventas
 * Endpoint: GET /api/v1/admin-panel/sales?page=1&limit=5
 */
export function RecentSales() {
  const { data, isLoading, isError } = useRecentSales();

  if (isLoading) {
    return <RecentSalesSkeleton />;
  }

  if (isError || !data) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <p className="text-destructive text-sm">Error al cargar ventas recientes</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="text-primary h-4 w-4" />
          <CardTitle className="text-base font-semibold">Actividad Reciente</CardTitle>
        </div>
        <CardDescription>Últimas {data.sales.length} transacciones registradas</CardDescription>
      </CardHeader>
      <CardContent>
        {data.sales.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">No hay ventas registradas</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.sales.map((sale) => (
                <SaleRow key={sale.id} sale={sale} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
