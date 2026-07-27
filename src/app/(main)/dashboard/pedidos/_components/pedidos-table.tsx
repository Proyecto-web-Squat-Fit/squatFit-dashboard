"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Download, Eye, Mail, ReceiptText, Search, Truck, UserRound } from "lucide-react";

import { BulkActionsBar } from "@/components/data-table/bulk-actions-bar";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditablePill } from "@/components/ui/editable-pill";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { usePedidos, useSendPedidoEmail, useUpdatePedidoPayment, useUpdatePedidoStatus } from "@/hooks/use-pedidos";
import { exportCSV, exportPDF, exportXLSX, type ExportColumn } from "@/lib/export/table-export";
import type { Pedido, PedidoStatus } from "@/lib/services/pedidos-service";

import { PedidoDetailModal } from "./pedido-detail-modal";
import { downloadInvoice, downloadShippingInfo } from "./pedido-downloads";
import {
  formatPedidoDate,
  formatTotal,
  PAYMENT_META,
  PAYMENT_OPTIONS,
  PaymentBadge,
  PedidoStatusBadge,
  STATUS_META,
  STATUS_OPTIONS,
} from "./pedidos-shared";

/** Pestañas de la cabecera (según el diseño; los cancelados se ven en "Todos"). */
const TABS: { key: "all" | PedidoStatus; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "completed", label: "Completado" },
  { key: "processing", label: "Procesando" },
  { key: "pending", label: "Pendiente" },
  { key: "refunded", label: "Reembolsado" },
];

const EXPORT_COLUMNS: ExportColumn<Pedido>[] = [
  { key: "shortId", label: "Pedido" },
  { key: "customerName", label: "Cliente" },
  { key: "customerEmail", label: "Email" },
  { key: "status", label: "Estado", value: (p) => STATUS_META[p.status].label },
  { key: "total", label: "Total", value: (p) => formatTotal(p) },
  {
    key: "paymentMethod",
    label: "Pago",
    value: (p) => (p.paymentMethod ? (PAYMENT_META[p.paymentMethod] ?? p.paymentMethod) : ""),
  },
  { key: "productsSummary", label: "Productos" },
  { key: "origin", label: "Origen" },
  { key: "createdAt", label: "Fecha", value: (p) => new Date(p.createdAt).toLocaleString("es-ES") },
];

/** Iconos de acción por fila; el set depende del estado (ver captura del diseño). */
function RowActions({
  pedido,
  onView,
  onComplete,
  onEmail,
}: {
  pedido: Pedido;
  onView: () => void;
  onComplete: () => void;
  onEmail: () => void;
}) {
  const iconCls = "h-4 w-4 text-[#363C98]";
  const btnCls = "size-7 hover:bg-[#EBEAF2]";
  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <Button variant="ghost" size="icon" className={btnCls} title="Ver pedido completo" onClick={onView}>
        <Eye className={iconCls} />
      </Button>
      {(pedido.status === "pending" || pedido.status === "processing" || pedido.status === "completed") && (
        <Button variant="ghost" size="icon" className={btnCls} title="Ir al cliente" asChild>
          <Link href="/dashboard/usuarios">
            <UserRound className={iconCls} />
          </Link>
        </Button>
      )}
      {(pedido.status === "pending" || pedido.status === "processing") && (
        <Button variant="ghost" size="icon" className={btnCls} title="Marcar como Completado" onClick={onComplete}>
          <CheckCircle2 className={iconCls} />
        </Button>
      )}
      {pedido.status === "completed" && (
        <Button
          variant="ghost"
          size="icon"
          className={btnCls}
          title="Descargar factura"
          onClick={() => void downloadInvoice(pedido)}
        >
          <ReceiptText className={iconCls} />
        </Button>
      )}
      {pedido.status === "processing" && (
        <Button
          variant="ghost"
          size="icon"
          className={btnCls}
          title="Descargar información de envío"
          onClick={() => downloadShippingInfo(pedido)}
        >
          <Truck className={iconCls} />
        </Button>
      )}
      {pedido.status !== "cancelled" && (
        <Button variant="ghost" size="icon" className={btnCls} title="Enviar email según estado" onClick={onEmail}>
          <Mail className={iconCls} />
        </Button>
      )}
    </div>
  );
}

export function PedidosTable() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [globalFilter, setGlobalFilter] = useState("");
  const [detailPedido, setDetailPedido] = useState<Pedido | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading, isError, error } = usePedidos({
    status: tab === "all" ? undefined : tab,
    limit: 100,
  });
  const pedidos = useMemo(() => data?.pedidos ?? [], [data]);
  const counts = data?.counts;

  const updateStatus = useUpdatePedidoStatus();
  const updatePayment = useUpdatePedidoPayment();
  const sendEmail = useSendPedidoEmail();

  const openDetail = (p: Pedido) => {
    setDetailPedido(p);
    setDetailOpen(true);
  };

  const columns = useMemo<ColumnDef<Pedido>[]>(
    () => [
      {
        id: "select",
        size: 44,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Seleccionar todo"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Seleccionar fila"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "customer",
        meta: { label: "Nombre y email" },
        accessorFn: (p) => `${p.customerName} ${p.customerEmail}`,
        header: "Nombre, Email",
        size: 220,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.customerName}</span>
            <span className="text-muted-foreground text-xs underline">{row.original.customerEmail}</span>
          </div>
        ),
        enableHiding: false,
      },
      {
        id: "idFecha",
        meta: { label: "ID y fecha" },
        accessorFn: (p) => p.createdAt,
        header: "ID, Fecha",
        size: 150,
        cell: ({ row }) => (
          <div className="flex flex-col">
            {/* Clic en el ID = abrir el pedido completo (como pide el diseño) */}
            <button
              type="button"
              className="text-left font-semibold text-[#363C98] hover:underline"
              onClick={() => openDetail(row.original)}
            >
              {row.original.shortId}
            </button>
            <span className="text-muted-foreground text-xs">{formatPedidoDate(row.original.createdAt)}</span>
          </div>
        ),
      },
      {
        id: "acciones",
        meta: { label: "Acciones" },
        header: "Acciones",
        size: 170,
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            pedido={row.original}
            onView={() => openDetail(row.original)}
            onComplete={() => updateStatus.mutate({ id: row.original.id, status: "completed" })}
            onEmail={() => sendEmail.mutate({ id: row.original.id })}
          />
        ),
      },
      {
        accessorKey: "status",
        header: "Estado",
        meta: { label: "Estado" },
        size: 140,
        cell: ({ row }) => (
          <EditablePill
            options={STATUS_OPTIONS}
            onSelect={(v) => updateStatus.mutate({ id: row.original.id, status: v as PedidoStatus })}
          >
            <PedidoStatusBadge status={row.original.status} />
          </EditablePill>
        ),
      },
      {
        accessorKey: "total",
        header: "Total",
        meta: { label: "Total" },
        size: 110,
        cell: ({ row }) => {
          const struck = row.original.status === "refunded" || row.original.status === "cancelled";
          return (
            <span className={`font-medium tabular-nums ${struck ? "text-muted-foreground line-through" : ""}`}>
              {formatTotal(row.original)}
            </span>
          );
        },
      },
      {
        accessorKey: "paymentMethod",
        meta: { label: "Pago" },
        header: "Pago",
        size: 120,
        cell: ({ row }) => (
          <EditablePill
            options={PAYMENT_OPTIONS}
            onSelect={(v) => updatePayment.mutate({ id: row.original.id, paymentMethod: v })}
          >
            <PaymentBadge method={row.original.paymentMethod} />
          </EditablePill>
        ),
      },
      {
        accessorKey: "productsSummary",
        meta: { label: "Productos" },
        header: "Productos",
        size: 200,
        cell: ({ row }) => <span className="line-clamp-2 text-sm">{row.original.productsSummary}</span>,
      },
      {
        accessorKey: "origin",
        header: "Origen",
        meta: { label: "Origen" },
        size: 160,
        cell: ({ row }) => <span className="text-muted-foreground line-clamp-2 text-sm">{row.original.origin}</span>,
      },
    ],
    [updateStatus, updatePayment, sendEmail],
  );

  const table = useDataTableInstance({
    data: pedidos,
    columns,
    persistKey: "pedidos",
    enableColumnResizing: true,
    getRowId: (row) => row.id,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  const selected = table.getSelectedRowModel().rows.map((r) => r.original);

  const bulkSetStatus = (status: PedidoStatus) => {
    selected.forEach((p) => updateStatus.mutate({ id: p.id, status }));
    table.resetRowSelection();
  };

  const handleBulkAction = (action: string) => {
    if (action.startsWith("estado:")) bulkSetStatus(action.split(":")[1] as PedidoStatus);
    else if (action === "email") {
      selected.forEach((p) => sendEmail.mutate({ id: p.id }));
      table.resetRowSelection();
    } else if (action === "exportar") {
      doExport("csv");
    }
  };

  const doExport = (fmt: "csv" | "xlsx" | "pdf") => {
    const rows = selected.length ? selected : pedidos;
    const name = `pedidos-${rows.length}`;
    if (fmt === "csv") exportCSV(name, EXPORT_COLUMNS, rows);
    else if (fmt === "xlsx") void exportXLSX(name, EXPORT_COLUMNS, rows);
    else void exportPDF(name, EXPORT_COLUMNS, rows, "Pedidos");
  };

  const tabCount = (key: (typeof TABS)[number]["key"]): number | null => {
    if (!counts) return null;
    return key === "all" ? counts.all : (counts[key] ?? 0);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl text-[#363C98]">Pedidos</CardTitle>
          <CardDescription>
            {/* Pestañas con contador, como en el diseño */}
            <span className="flex flex-wrap items-center gap-1 pt-1 text-sm">
              {TABS.map((t, idx) => (
                <span key={t.key} className="flex items-center gap-1">
                  {idx > 0 && <span className="text-muted-foreground px-1">|</span>}
                  <button
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={
                      tab === t.key ? "font-semibold text-[#FF690B]" : "font-medium text-[#363C98] hover:underline"
                    }
                  >
                    {t.label}
                    {tabCount(t.key) !== null && ` (${tabCount(t.key)})`}
                  </button>
                </span>
              ))}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Acciones en lote: siempre visibles (diseño), Aplicar se activa al seleccionar */}
          <BulkActionsBar
            selectedCount={selected.length}
            onApply={handleBulkAction}
            actions={[
              ...STATUS_OPTIONS.map((s) => ({ value: `estado:${s.value}`, label: `Cambiar a ${s.label}` })),
              { value: "email", label: "Enviar email de estado" },
              { value: "exportar", label: "Exportar selección (CSV)" },
            ]}
          />

          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
              <Input
                placeholder="Buscar pedidos por cliente, email o ID..."
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
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

          <div className="sqf-table overflow-hidden rounded-lg border">
            {isLoading ? (
              <div className="flex h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
                  <p className="text-muted-foreground text-sm">Cargando pedidos...</p>
                </div>
              </div>
            ) : isError ? (
              <div className="flex h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-sm font-medium text-[#9f4e63]">Error al cargar los pedidos</p>
                  <p className="text-muted-foreground text-xs">
                    {error instanceof Error ? error.message : "Error desconocido"}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2">
                    Reintentar
                  </Button>
                </div>
              </div>
            ) : pedidos.length === 0 ? (
              <div className="flex h-[400px] items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-sm font-medium">No hay pedidos en esta vista</p>
                  <p className="text-muted-foreground text-xs">
                    Los pedidos aparecerán aquí cuando lleguen compras desde la web
                  </p>
                </div>
              </div>
            ) : (
              <DataTable table={table} columns={columns} enableColumnResize enableColumnReorder />
            )}
          </div>

          {!isLoading && !isError && pedidos.length > 0 && <DataTablePagination table={table} />}
        </CardContent>
      </Card>

      <PedidoDetailModal pedido={detailPedido} open={detailOpen} onOpenChange={setDetailOpen} />
    </>
  );
}
