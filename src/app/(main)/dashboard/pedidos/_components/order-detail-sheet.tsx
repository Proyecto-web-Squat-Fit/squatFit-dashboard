"use client";

import Link from "next/link";

import { Mail, User, CheckCircle2, Undo2, ExternalLink, Package, MapPin, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  useGenerateInvoice,
  useOrderInvoice,
  useSendOrderEmail,
  useUpdateOrderPayment,
  useUpdateOrderStatus,
} from "@/hooks/use-orders";
import {
  MANUAL_PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  formatOrderPrice,
  formatRefundReason,
  relativeDate,
  type Order,
  type PaymentMethod,
} from "@/lib/services/orders-service";

import { OrderShipmentPanel } from "./order-shipment-panel";
import { OrderStatusBadge, PaymentBadge } from "./order-status-badge";

/** Tipos de línea que se mandan en un paquete (el resto es acceso digital). */
const PHYSICAL_PRODUCT_TYPES = ["book", "version", "pack", "product"];

interface OrderDetailSheetProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefund: (order: Order) => void;
}

function addressLines(addr: Record<string, unknown> | null): string[] {
  if (!addr) return [];
  const get = (k: string) => {
    const v = addr[k];
    return typeof v === "string" ? v : "";
  };
  return [
    get("address") || get("street"),
    [get("city"), get("province") || get("sector"), get("postal_code") || get("cp")].filter(Boolean).join(", "),
    get("country"),
    get("phone") ? `Tel: ${get("phone")}` : "",
    get("notes"),
  ].filter(Boolean);
}

export function OrderDetailSheet({ order, open, onOpenChange, onRefund }: OrderDetailSheetProps) {
  const updateStatus = useUpdateOrderStatus();
  const updatePayment = useUpdateOrderPayment();
  const sendEmail = useSendOrderEmail();
  const invoice = useOrderInvoice(order?.id);
  const generateInvoice = useGenerateInvoice();

  if (!order) return null;

  const canComplete = order.status === "pending" || order.status === "processing";
  const canRefund = order.status === "completed" || order.status === "processing" || order.status === "shipped";
  const address = addressLines(order.shippingAddress);
  // El bloque de envío solo tiene sentido en pedidos que viajan en un paquete:
  // hay dirección postal, alguna línea física, o ya se anotó un envío.
  const isPhysical =
    address.length > 0 ||
    order.status === "shipped" ||
    order.items.some((i) => PHYSICAL_PRODUCT_TYPES.includes(String(i.product_type ?? "").toLowerCase()));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-lg">Pedido #{order.id.slice(0, 8)}</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentBadge method={order.paymentMethod} />
            <span className="text-xs">{relativeDate(order.createdAt)}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 py-4">
          {/* Cliente */}
          <div className="space-y-1 text-sm">
            <p className="font-medium">{order.customerName}</p>
            <p className="text-muted-foreground">{order.customerEmail}</p>
            {order.origin && <p className="text-muted-foreground text-xs">Origen: {order.origin}</p>}
            {order.userId && (
              <Button asChild variant="outline" size="sm" className="mt-1 gap-1.5">
                <Link href={`/dashboard/alumnos/${order.userId}`}>
                  <User className="size-3.5" /> Ficha del cliente
                  <ExternalLink className="size-3" />
                </Link>
              </Button>
            )}
          </div>

          <Separator />

          {/* Productos */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Package className="size-4" /> Productos
            </div>
            <div className="space-y-1.5">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between text-sm">
                  <span>
                    {it.product_name}
                    {it.quantity > 1 && <span className="text-muted-foreground"> ×{it.quantity}</span>}
                  </span>
                  <span className="text-muted-foreground">{Number(it.unit_price).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
              <span>Total</span>
              <span className={order.status === "refunded" || order.status === "cancelled" ? "line-through" : ""}>
                {formatOrderPrice(order.total, order.currency)}
              </span>
            </div>
          </div>

          {/* Dirección de envío */}
          {address.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="size-4" /> Dirección de envío
                </div>
                {address.map((line, i) => (
                  <p key={i} className="text-muted-foreground text-sm">
                    {line}
                  </p>
                ))}
              </div>
            </>
          )}

          {/* Registro del envío (transportista + nº de seguimiento + aviso) */}
          {isPhysical && (
            <>
              <Separator />
              <OrderShipmentPanel order={order} />
            </>
          )}

          {/* Reembolso */}
          {order.refundReason && (
            <>
              <Separator />
              <div className="rounded-md bg-slate-100 p-3 text-sm dark:bg-slate-800">
                <p className="font-medium text-slate-700 dark:text-slate-200">Reembolsado</p>
                <p className="text-muted-foreground">Motivo: {formatRefundReason(order.refundReason)}</p>
                {order.refundNote && <p className="text-muted-foreground">Nota: {order.refundNote}</p>}
              </div>
            </>
          )}

          <Separator />

          {/* Método de pago (editable solo para pagos manuales: seQura / efectivo) */}
          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select
              value={order.paymentMethod ?? ""}
              onValueChange={(v: PaymentMethod) =>
                updatePayment.mutate(
                  { id: order.id, method: v },
                  {
                    onSuccess: () => toast.success(`Pago → ${PAYMENT_METHOD_LABEL[v]}`),
                    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
                  },
                )
              }
              disabled={updatePayment.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Marcar pago manual…" />
              </SelectTrigger>
              <SelectContent>
                {MANUAL_PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_METHOD_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Solo pagos manuales (seQura/efectivo). Los de tarjeta/SEPA/Klarna los fija Stripe automáticamente.
            </p>
          </div>

          <Separator />

          {/* Acciones */}
          <div className="grid grid-cols-1 gap-2">
            {canComplete && (
              <Button
                className="gap-2"
                onClick={() =>
                  updateStatus.mutate(
                    { id: order.id, status: "completed" },
                    {
                      onSuccess: () => toast.success("Pedido marcado como completado"),
                      onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
                    },
                  )
                }
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Marcar como completado
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                sendEmail.mutate(
                  { id: order.id },
                  {
                    onSuccess: (r) => toast.success(r.message || "Email enviado al cliente"),
                    onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
                  },
                )
              }
              disabled={sendEmail.isPending}
            >
              {sendEmail.isPending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
              Enviar email de estado
            </Button>
            {/*
              Factura: la emite el backend con numeración de serie (SQF-<año>-NNNN).
              Emitir y descargar son dos pasos a propósito: emitir gasta un número
              de la serie, y así el enlace de descarga es un <a> de verdad (nada de
              window.open tras un await, que el navegador bloquea).
            */}
            {invoice.isLoading ? (
              <Button variant="outline" className="gap-2" disabled>
                <Loader2 className="size-4 animate-spin" /> Factura…
              </Button>
            ) : invoice.data ? (
              <Button asChild variant="outline" className="gap-2">
                <a href={invoice.data.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="size-4" /> Factura {invoice.data.invoiceNumber}
                  <ExternalLink className="size-3" />
                </a>
              </Button>
            ) : (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  generateInvoice.mutate(
                    { orderId: order.id },
                    {
                      onSuccess: (inv) => toast.success(`Factura ${inv.invoiceNumber} emitida`),
                      onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
                    },
                  )
                }
                disabled={generateInvoice.isPending}
              >
                {generateInvoice.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileText className="size-4" />
                )}
                Emitir factura
              </Button>
            )}
            {canRefund && (
              <Button variant="outline" className="gap-2 text-rose-700" onClick={() => onRefund(order)}>
                <Undo2 className="size-4" /> Reembolsar
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
