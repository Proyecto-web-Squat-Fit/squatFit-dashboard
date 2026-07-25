"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { Search, Eye, User, CheckCircle2, Mail, Undo2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { BrandTabs } from "@/components/brand-tabs";
import { FilterChips } from "@/components/filter-chips";
import { RefundOrderDialog } from "@/components/modals/refund-order-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEncargados } from "@/hooks/use-encargados";
import { useOrders, useSendOrderEmail, useUpdateOrderStatus } from "@/hooks/use-orders";
import { useCatalogProducts } from "@/hooks/use-products-catalog";
import {
  ORDER_STATUS_META,
  formatOrderPrice,
  itemsSummary,
  relativeDate,
  type Order,
  type OrderItem,
  type OrderStatus,
} from "@/lib/services/orders-service";
import { GRANT_TYPES, GRANT_TYPE_LABEL, type Product } from "@/lib/services/products-service";

import { OrderDetailSheet } from "./order-detail-sheet";
import { OrderStatusBadge, PaymentBadge } from "./order-status-badge";

/** Debounce local: evita disparar un GET (limit=200) en cada tecla. */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

/** Pestañas: Todos + los 5 estados del diseño, con contador. */
const STATUS_TABS: { id: OrderStatus | "all"; countKey: string }[] = [
  { id: "all", countKey: "all" },
  { id: "pending", countKey: "pending" },
  { id: "processing", countKey: "processing" },
  { id: "completed", countKey: "completed" },
  { id: "refunded", countKey: "refunded" },
  { id: "cancelled", countKey: "cancelled" },
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

export function OrdersView() {
  const [tab, setTab] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
  // Filtros multi-selección (pastillas). Vacío = «Todos».
  const [categories, setCategories] = useState<string[]>([]);
  const [encargadosSel, setEncargadosSel] = useState<string[]>([]);

  const debouncedSearch = useDebounce(search, 350);
  const { data, isLoading } = useOrders({ status: tab, search: debouncedSearch });
  const updateStatus = useUpdateOrderStatus();
  const sendEmail = useSendOrderEmail();

  // Catálogo (para resolver la categoría de cada línea) y encargados (staff).
  const { data: products = [] } = useCatalogProducts();
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const { options: encargadoOptions, matchesUser } = useEncargados();

  const orders = data?.orders ?? [];
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
    return out;
  }, [orders, categories, encargadosSel, productsById, matchesUser]);

  // Mantener el pedido abierto sincronizado con los datos frescos.
  const openOrder = selected ? (orders.find((o) => o.id === selected.id) ?? selected) : null;

  const tabs = useMemo(
    () =>
      STATUS_TABS.map((t) => {
        const label = t.id === "all" ? "Todos" : ORDER_STATUS_META[t.id].label;
        const n = counts[t.countKey];
        return { id: t.id, label: typeof n === "number" ? `${label} · ${n}` : label };
      }),
    [counts],
  );

  const openDetail = (order: Order) => {
    setSelected(order);
    setDetailOpen(true);
  };

  const markCompleted = (order: Order) =>
    updateStatus.mutate(
      { id: order.id, status: "completed" },
      {
        onSuccess: () => toast.success("Pedido marcado como completado"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
      },
    );

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
      </div>

      <BrandTabs tabs={tabs} active={tab} onChange={(id) => setTab(id as OrderStatus | "all")} />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#EBEAF2]/60 hover:bg-[#EBEAF2]/60 dark:bg-[#363C98]/25 dark:hover:bg-[#363C98]/25">
                    <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Cliente</TableHead>
                    <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Pedido</TableHead>
                    <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Productos</TableHead>
                    <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Origen</TableHead>
                    <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Pago</TableHead>
                    <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Estado</TableHead>
                    <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Total</TableHead>
                    <TableHead className="text-right text-[#363C98] dark:text-[#b9bce8]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                        No hay pedidos en esta vista.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleOrders.map((o) => {
                      const struck = o.status === "refunded" || o.status === "cancelled";
                      const canComplete = o.status === "pending" || o.status === "processing";
                      // Estado por fila: solo la fila mutada muestra spinner / se deshabilita.
                      const isCompleting = updateStatus.isPending && updateStatus.variables?.id === o.id;
                      const isEmailing = sendEmail.isPending && sendEmail.variables?.id === o.id;
                      return (
                        <TableRow key={o.id} className="hover:bg-[#FFEDE0]/40 dark:hover:bg-[#FF690B]/10">
                          <TableCell>
                            <p className="font-medium">{o.customerName}</p>
                            <p className="text-muted-foreground text-xs">{o.customerEmail}</p>
                          </TableCell>
                          <TableCell>
                            <button
                              className="text-[#FF690B] hover:underline"
                              onClick={() => openDetail(o)}
                              title="Ver pedido"
                            >
                              #{o.id.slice(0, 8)}
                            </button>
                            <p className="text-muted-foreground text-xs">{relativeDate(o.createdAt)}</p>
                          </TableCell>
                          <TableCell
                            className="text-muted-foreground max-w-[220px] truncate text-sm"
                            title={itemsSummary(o.items)}
                          >
                            {itemsSummary(o.items)}
                          </TableCell>
                          <TableCell
                            className="text-muted-foreground max-w-[140px] truncate text-xs"
                            title={o.origin ?? ""}
                          >
                            {o.origin ?? "—"}
                          </TableCell>
                          <TableCell>
                            <PaymentBadge method={o.paymentMethod} />
                          </TableCell>
                          <TableCell>
                            <OrderStatusBadge status={o.status} />
                          </TableCell>
                          <TableCell className={struck ? "text-muted-foreground line-through" : ""}>
                            {formatOrderPrice(o.total, o.currency)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-0.5">
                              <Button variant="ghost" size="icon" onClick={() => openDetail(o)} title="Ver pedido">
                                <Eye className="size-4" />
                              </Button>
                              {o.userId && (
                                <Button asChild variant="ghost" size="icon" title="Ficha del cliente">
                                  <Link href={`/dashboard/alumnos/${o.userId}`}>
                                    <User className="size-4" />
                                  </Link>
                                </Button>
                              )}
                              {canComplete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => markCompleted(o)}
                                  disabled={isCompleting}
                                  title="Marcar como completado"
                                >
                                  {isCompleting ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="size-4 text-green-600" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  sendEmail.mutate(
                                    { id: o.id },
                                    {
                                      onSuccess: (r) => toast.success(r.message || "Email enviado"),
                                      onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
                                    },
                                  )
                                }
                                disabled={isEmailing}
                                title="Enviar email de estado"
                              >
                                {isEmailing ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                              </Button>
                              {(o.status === "completed" || o.status === "processing") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-rose-600"
                                  onClick={() => setRefundOrder(o)}
                                  title="Reembolsar"
                                >
                                  <Undo2 className="size-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
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
        onRefunded={() => setRefundOrder(null)}
      />
    </div>
  );
}
