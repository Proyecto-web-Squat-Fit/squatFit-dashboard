import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  ORDER_STATUS_META,
  PAYMENT_METHOD_LABEL,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/services/orders-service";
import { cn } from "@/lib/utils";

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const meta = ORDER_STATUS_META[status];
  return <Badge className={cn("font-medium", meta.badge, className)}>{meta.label}</Badge>;
}

export function PaymentBadge({ method }: { method: PaymentMethod | null }) {
  if (!method) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <Badge variant="outline" className="font-normal">
      {PAYMENT_METHOD_LABEL[method]}
    </Badge>
  );
}

/**
 * Píldora de factura de la columna «Factura» de Pedidos. Tres estados, no
 * dos: `hasInvoice === null` (backend sin el campo todavía — PR #87 sin
 * desplegar a 31-jul) es «no disponible», DISTINTO de `false` («sin
 * factura», el caso normal hoy: `invoices` está a 0 porque ningún pedido
 * llega al umbral de 399 € y la emisión manual es un botón, no automática).
 * Confundir los dos haría parecer que ningún pedido tiene ni tendrá nunca
 * factura, cuando en realidad es que todavía no se puede saber.
 */
export function InvoiceBadge({
  hasInvoice,
  invoiceNumber,
}: {
  hasInvoice: boolean | null;
  invoiceNumber: string | null;
}) {
  if (hasInvoice === null) {
    return (
      <span className="text-muted-foreground text-xs" title="El backend de esta instancia aún no manda este dato">
        No disponible
      </span>
    );
  }
  if (!hasInvoice) {
    return <span className="text-muted-foreground text-xs">Sin factura</span>;
  }
  return (
    <Badge variant="outline" className="gap-1 font-normal">
      <FileText className="size-3" />
      {invoiceNumber ?? "Emitida"}
    </Badge>
  );
}
