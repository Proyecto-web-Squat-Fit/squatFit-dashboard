"use client";

import { useEffect, useMemo, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { Download, Search, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { BrandTabs } from "@/components/brand-tabs";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { FilterChips } from "@/components/filter-chips";
import { RefundOrderDialog } from "@/components/modals/refund-order-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { useEncargados } from "@/hooks/use-encargados";
import { useOrders, useSendOrderEmail, useUpdateOrderPayment, useUpdateOrderStatus } from "@/hooks/use-orders";
import { useCatalogProducts } from "@/hooks/use-products-catalog";
import { exportCSV, exportPDF, exportXLSX, type ExportColumn } from "@/lib/export/table-export";
import {
  ORDER_STATUS_META,
  OrdersService,
  PAYMENT_METHOD_LABEL,
  formatOrderPrice,
  itemsSummary,
  type Order,
  type OrderItem,
  type OrderStatus,
} from "@/lib/services/orders-service";
import { GRANT_TYPES, GRANT_TYPE_LABEL, type Product } from "@/lib/services/products-service";

import { construirColumnasPedidos } from "./columns.pedidos";
import { OrderDetailSheet } from "./order-detail-sheet";

/** Debounce local: evita disparar un GET (limit=200) en cada tecla. */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

/** Pestañas: Todos + los estados del diseño (con «Enviado»), con contador. */
type TabPedidos = OrderStatus | "all" | "trash";

const STATUS_TABS: { id: TabPedidos; countKey: string }[] = [
  { id: "all", countKey: "all" },
  { id: "pending", countKey: "pending" },
  { id: "processing", countKey: "processing" },
  { id: "shipped", countKey: "shipped" },
  { id: "completed", countKey: "completed" },
  { id: "refunded", countKey: "refunded" },
  { id: "cancelled", countKey: "cancelled" },
  // Al final y aparte: es una vista distinta, no un estado más del pedido.
  { id: "trash", countKey: "trash" },
];

// ─── Filtro «Categoría» (del producto) ───────────────────────────────────────
// La categoría visible del catálogo es el `grant_type` del producto (Curso,
// Programa, Libro, Pack, Biblioteca); lo que no tiene concesión cae en «Otros».
const CATEGORY_OTHER = "otros";

const CATEGORY_OPTIONS = [
  ...GRANT_TYPES.map((g) => ({ id: g as string, label: GRANT_TYPE_LABEL[g] })),
  { id: CATEGORY_OTHER, label: "Otros" },
];

/** Categoría de una línea del pedido: producto del catálogo o, si no, su `product_type`. */
function itemCategory(item: OrderItem, productsById: Map<string, Product>): string {
  const product = item.product_id ? productsById.get(String(item.product_id)) : undefined;
  if (product?.grantType) return product.grantType;
  const t = String(item.product_type ?? "").toLowerCase();
  if ((GRANT_TYPES as readonly string[]).includes(t)) return t;
  return CATEGORY_OTHER;
}

// ─── Filtro «Factura» ─────────────────────────────────────────────────────
// EN CLIENTE, igual que Categoría/Encargado (ver comentario junto a
// `visibleOrders` más abajo): el GET de pedidos no acepta `has_invoice`
// todavía en el backend desplegado (PR #87 de SquatFit, abierto y SIN
// DESPLEGAR a 31-jul) y `QueryOrdersDTO` rechaza parámetros que no conoce
// (`forbidNonWhitelisted`), así que mandarlo tumbaría el listado ENTERO
// contra el API real de hoy. Filtrando sobre lo ya cargado no hace falta
// esperar al despliegue y no hay riesgo de romper nada mientras tanto.
const INVOICE_FILTER_OPTIONS = [
  { id: "con", label: "Con factura" },
  { id: "sin", label: "Sin factura" },
];

/** `null` (dato no disponible, backend viejo) no coincide con ningún filtro: no se sabe. */
function matchesInvoiceFilter(order: Order, seleccion: string[]): boolean {
  if (seleccion.length === 0) return true;
  if (order.hasInvoice === null) return false;
  return (order.hasInvoice && seleccion.includes("con")) || (!order.hasInvoice && seleccion.includes("sin"));
}

/** Columnas de la exportación (CSV / Excel / PDF). */
const EXPORT_COLUMNS: ExportColumn<Order>[] = [
  { key: "id", label: "Pedido", value: (o) => `#${o.id.slice(0, 8)}` },
  { key: "customerName", label: "Cliente" },
  { key: "customerEmail", label: "Email" },
  { key: "status", label: "Estado", value: (o) => ORDER_STATUS_META[o.status].label },
  { key: "total", label: "Total", value: (o) => formatOrderPrice(o.total, o.currency) },
  { key: "paymentMethod", label: "Pago", value: (o) => (o.paymentMethod ? PAYMENT_METHOD_LABEL[o.paymentMethod] : "") },
  { key: "items", label: "Productos", value: (o) => itemsSummary(o.items) },
  { key: "origin", label: "Origen", value: (o) => o.origin ?? "" },
  {
    key: "invoice",
    label: "Factura",
    value: (o) => (o.hasInvoice === null ? "" : o.hasInvoice ? (o.invoiceNumber ?? "Sí") : "No"),
  },
  { key: "createdAt", label: "Fecha", value: (o) => new Date(o.createdAt).toLocaleString("es-ES") },
];

export function OrdersView() {
  const [tab, setTab] = useState<TabPedidos>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
  // Filtros multi-selección (pastillas). Vacío = «Todos».
  const [categories, setCategories] = useState<string[]>([]);
  const [encargadosSel, setEncargadosSel] = useState<string[]>([]);
  const [facturaSel, setFacturaSel] = useState<string[]>([]);

  const debouncedSearch = useDebounce(search, 350);
  const { data, isLoading } = useOrders({ status: tab, search: debouncedSearch });
  const updateStatus = useUpdateOrderStatus();
  const updatePayment = useUpdateOrderPayment();
  const sendEmail = useSendOrderEmail();

  // Catálogo (para resolver la categoría de cada línea) y encargados (staff).
  const { data: products = [] } = useCatalogProducts();
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const { options: encargadoOptions, matchesUser } = useEncargados();

  const orders = useMemo(() => data?.orders ?? [], [data]);
  const counts = data?.counts ?? {};

  // El GET /admin-panel/orders (QueryOrdersDTO, forbidNonWhitelisted) SOLO
  // acepta status/search/limit, así que Categoría y Encargado se filtran EN
  // CLIENTE sobre la página cargada (limit=200), igual que hace Leads con
  // «Asignado».
  const visibleOrders = useMemo(() => {
    let out = orders;
    if (categories.length > 0) {
      out = out.filter((o) => o.items.some((i) => categories.includes(itemCategory(i, productsById))));
    }
    if (encargadosSel.length > 0) {
      out = out.filter((o) => matchesUser(o.userId, encargadosSel));
    }
    if (facturaSel.length > 0) {
      out = out.filter((o) => matchesInvoiceFilter(o, facturaSel));
    }
    return out;
  }, [orders, categories, encargadosSel, facturaSel, productsById, matchesUser]);

  // Mantener el pedido abierto sincronizado con los datos frescos.
  const openOrder = selected ? (orders.find((o) => o.id === selected.id) ?? selected) : null;

  const tabs = useMemo(
    () =>
      STATUS_TABS.map((t) => {
        const label = t.id === "all" ? "Todos" : t.id === "trash" ? "Papelera" : ORDER_STATUS_META[t.id].label;
        const n = counts[t.countKey];
        return { id: t.id, label: typeof n === "number" ? `${label} · ${n}` : label };
      }),
    [counts],
  );

  const columns = useMemo(
    () =>
      construirColumnasPedidos({
        onVer: (order) => {
          setSelected(order);
          setDetailOpen(true);
        },
        onCompletar: (order) =>
          updateStatus.mutate(
            { id: order.id, status: "completed" },
            {
              onSuccess: () => toast.success("Pedido marcado como completado"),
              onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
            },
          ),
        onEmail: (order) =>
          sendEmail.mutate(
            { id: order.id },
            {
              onSuccess: (r) => toast.success(r.message || "Email enviado"),
              onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
            },
          ),
        onReembolsar: setRefundOrder,
        // `mutateAsync` y no `mutate`: la celda editable necesita que la promesa
        // lance para volver al valor anterior si el servidor rechaza el cambio.
        onCambiarEstado: (order, status) => updateStatus.mutateAsync({ id: order.id, status }),
        onCambiarPago: (order, method) => updatePayment.mutateAsync({ id: order.id, method }),
        completando: (id) => updateStatus.isPending && updateStatus.variables?.id === id,
        enviandoEmail: (id) => sendEmail.isPending && sendEmail.variables?.id === id,
      }),
    [updateStatus, updatePayment, sendEmail],
  );

  const table = useDataTableInstance({
    data: visibleOrders,
    columns,
    persistKey: "pedidos",
    enableColumnResizing: true,
    getRowId: (row) => row.id,
    // 20 y no 25: el selector de «Filas por página» solo ofrece 10/20/30/40/50 y
    // con un valor que no está en la lista sale en blanco.
    defaultPageSize: 20,
  });

  const seleccionados = table.getSelectedRowModel().rows.map((r) => r.original);

  const queryClient = useQueryClient();
  const [enLote, setEnLote] = useState(false);

  /**
   * Ejecuta una acción de lote y refresca. Los errores del backend se enseñan
   * tal cual: el de «no se puede borrar un pedido con factura» nombra los
   * pedidos concretos, y resumirlo a «error» dejaría al gestor sin saber cuál.
   */
  const accionEnLote = async (fn: (ids: string[]) => Promise<{ message: string }>) => {
    setEnLote(true);
    try {
      const { message } = await fn(seleccionados.map((o) => o.id));
      toast.success(message);
      table.resetRowSelection();
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar la acción");
    } finally {
      setEnLote(false);
    }
  };

  const aLaPapelera = () => accionEnLote(OrdersService.bulkTrash);
  const restaurar = () => accionEnLote(OrdersService.bulkRestore);
  const borrarDefinitivo = () => {
    // Confirmación explícita: esto sí es irreversible, a diferencia de la papelera.
    const n = seleccionados.length;
    if (!window.confirm(`Vas a borrar ${n} pedido${n > 1 ? "s" : ""} DEFINITIVAMENTE. No se puede deshacer. ¿Seguro?`))
      return;
    return accionEnLote(OrdersService.bulkDelete);
  };

  const exportar = (fmt: "csv" | "xlsx" | "pdf") => {
    // Lo seleccionado si hay algo marcado; si no, todo lo que se está viendo.
    const filas = seleccionados.length ? seleccionados : visibleOrders;
    const nombre = `pedidos-${filas.length}`;
    if (fmt === "csv") exportCSV(nombre, EXPORT_COLUMNS, filas);
    else if (fmt === "xlsx") void exportXLSX(nombre, EXPORT_COLUMNS, filas);
    else void exportPDF(nombre, EXPORT_COLUMNS, filas, "Pedidos");
  };

  return (
    <div className="@container/main flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
        <p className="text-muted-foreground text-sm">
          Compras de la web y del catálogo con su estado, método de pago y origen.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
          <Input
            placeholder="Buscar por nombre, email o nº de pedido…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Download className="size-4" />
              Exportar
              {seleccionados.length > 0 && ` (${seleccionados.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportar("csv")}>CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportar("xlsx")}>Excel (XLSX)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportar("pdf")}>PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Acciones en LOTE: solo con filas marcadas, y el juego depende de si
            estás en la papelera o en la lista normal. */}
        {seleccionados.length > 0 &&
          (tab === "trash" ? (
            <>
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={restaurar} disabled={enLote}>
                <Undo2 className="size-4" />
                Restaurar ({seleccionados.length})
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-8 gap-1"
                onClick={borrarDefinitivo}
                disabled={enLote}
              >
                <Trash2 className="size-4" />
                Borrar
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" className="h-8 gap-1" onClick={aLaPapelera} disabled={enLote}>
              <Trash2 className="size-4" />
              Mover a la papelera ({seleccionados.length})
            </Button>
          ))}
        <DataTableViewOptions table={table} />
      </div>

      {/* Pastillas multi-selección: varias categorías/encargados a la vez; «Todos» limpia. */}
      <div className="flex flex-col gap-2">
        <FilterChips label="Categoría" options={CATEGORY_OPTIONS} selected={categories} onChange={setCategories} />
        <FilterChips
          label="Encargado"
          options={encargadoOptions}
          selected={encargadosSel}
          onChange={setEncargadosSel}
        />
        <FilterChips label="Factura" options={INVOICE_FILTER_OPTIONS} selected={facturaSel} onChange={setFacturaSel} />
      </div>

      <BrandTabs tabs={tabs} active={tab} onChange={(id) => setTab(id as TabPedidos)} />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="space-y-4 pt-6">
            {visibleOrders.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">No hay pedidos en esta vista.</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border">
                  <DataTable table={table} columns={columns} enableColumnResize enableColumnReorder />
                </div>
                <DataTablePagination table={table} />
              </>
            )}
          </CardContent>
        </Card>
      )}

      <OrderDetailSheet
        order={openOrder}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onRefund={(o) => setRefundOrder(o)}
      />
      <RefundOrderDialog
        open={refundOrder != null}
        onOpenChange={(o) => !o && setRefundOrder(null)}
        orderId={refundOrder?.id ?? ""}
        orderRef={refundOrder ? `#${refundOrder.id.slice(0, 8)}` : undefined}
        orderTotal={refundOrder?.total}
        orderRefunded={refundOrder?.refundedAmount}
        onRefunded={() => setRefundOrder(null)}
      />
    </div>
  );
}
