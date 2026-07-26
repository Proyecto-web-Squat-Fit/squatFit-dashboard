"use client";

import { Badge } from "@/components/ui/badge";
import type { Pedido, PedidoStatus } from "@/lib/services/pedidos-service";

// ============================================================================
// Piezas compartidas del módulo de Pedidos (badges, etiquetas, formatos)
// ============================================================================

/** Píldoras de estado según la leyenda del diseño. */
export const STATUS_META: Record<PedidoStatus, { label: string; cls: string }> = {
  completed: { label: "Completado", cls: "sqf-badge-green" },
  processing: { label: "Procesando", cls: "sqf-badge-indigo" },
  pending: { label: "Pendiente", cls: "sqf-badge-orange" },
  refunded: { label: "Devuelto", cls: "sqf-badge-muted" },
  cancelled: { label: "Cancelado", cls: "sqf-badge-muted" },
};

export const STATUS_OPTIONS: { value: PedidoStatus; label: string }[] = [
  { value: "pending", label: "Pendiente" },
  { value: "processing", label: "Procesando" },
  { value: "completed", label: "Completado" },
  { value: "refunded", label: "Devuelto" },
  { value: "cancelled", label: "Cancelado" },
];

/** Instrumentos de pago: card/sepa/klarna llegan de Stripe; sequra/cash se marcan a mano. */
export const PAYMENT_META: Record<string, string> = {
  card: "Tarjeta",
  sepa_debit: "SEPA",
  klarna: "Klarna",
  sequra: "seQura",
  cash: "Efectivo",
};

export const PAYMENT_OPTIONS = Object.entries(PAYMENT_META).map(([value, label]) => ({ value, label }));

export function PedidoStatusBadge({ status }: { status: PedidoStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <Badge variant="outline" className={meta.cls}>
      {meta.label}
    </Badge>
  );
}

export function PaymentBadge({ method }: { method: string | null }) {
  if (!method) {
    return (
      <Badge variant="outline" className="sqf-badge-muted">
        Sin marcar
      </Badge>
    );
  }
  // Tarjeta con estilo propio; financiación/banco (SEPA/Klarna/seQura) agrupados en índigo
  const cls = method === "card" ? "sqf-badge-green" : method === "cash" ? "sqf-badge-muted" : "sqf-badge-indigo";
  return (
    <Badge variant="outline" className={cls}>
      {PAYMENT_META[method] ?? method}
    </Badge>
  );
}

/** Fecha estilo del diseño: "Hace 3 horas" / "Ayer, 12:34" / "3 Dic, 2025". */
export function formatPedidoDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);

  if (diffMin < 60 && diffMin >= 0) return diffMin <= 1 ? "Hace 1 min" : `Hace ${diffMin} min`;
  if (diffH < 24 && diffH >= 0) return diffH === 1 ? "Hace 1 hora" : `Hace ${diffH} horas`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Ayer, ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTotal(p: Pedido): string {
  return `${p.currency}${p.total.toFixed(2)}`;
}
