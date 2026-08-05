import { handleUnauthorized } from "@/lib/api-client";
import { getAuthToken } from "@/lib/auth/auth-utils";
import { formatearImporte } from "@/lib/formato-de-tablas";
import { API_BASE_URL } from "@/lib/services/api-base";

/** Corta peticiones colgadas para que la UI no quede en isLoading para siempre. */
const REQUEST_TIMEOUT = 12000;

// ============================================================================
// PEDIDOS (módulo Pedidos · Fase 6 + catálogo Fase 12) — EN PROD 21-jul-2026
// ----------------------------------------------------------------------------
//   • GET    /api/v1/admin-panel/orders            (lista + counts; status/search/limit)
//   • GET    /api/v1/admin-panel/orders/:id         (detalle: items, envío, reembolso)
//   • PUT    /api/v1/admin-panel/orders/:id/status  { status }
//   • PUT    /api/v1/admin-panel/orders/:id/payment { payment_method }   (pagos manuales)
//   • POST   /api/v1/admin-panel/orders/:id/email   { status? }          (email por estado)
//   • POST   /api/v1/admin-panel/orders/:id/refund  { reason, note?, amount_cents? }
//   • GET    /api/v1/admin-panel/orders/:id/invoice                      (404 si no hay)
//   • POST   /api/v1/admin-panel/orders/:id/invoice[?regenerate=true]    (emite; idempotente)
//
// El checkout/webhook de Stripe (y los pedidos de CATÁLOGO de Fase 12) pueblan
// `orders`/`order_items` con `payment_method` (instrumento real) y `origin`
// (UTM/atribución). Verificado contra prod: la lista devuelve ambos campos.
//
// ⚠️ Cambios de contrato respecto a Fase 7 (verificados 21-jul-2026):
//   • `reason` del reembolso es un SLUG cerrado (equivocacion|pausa_baja|…), no
//     el texto; la nota va en `note` aparte (antes se concatenaba → 400).
//   • payment_method válidos: card|sepa_debit|klarna|sequra|cash.
// ============================================================================

/** Estados del pedido (contrato ADMIN_STATUSES del backend). */
export const ORDER_STATUSES = ["completed", "shipped", "processing", "pending", "refunded", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

interface StatusMeta {
  label: string;
  /** Clase de la píldora (paleta de marca + neutros). */
  badge: string;
  /** El total se muestra tachado (reembolsado/cancelado). */
  struck?: boolean;
}

export const ORDER_STATUS_META: Record<OrderStatus, StatusMeta> = {
  completed: { label: "Completado", badge: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" },
  shipped: { label: "Enviado", badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200" },
  processing: { label: "Procesando", badge: "bg-[#EBEAF2] text-[#363C98] dark:bg-[#363C98]/30 dark:text-[#b9bce8]" },
  pending: { label: "Pendiente", badge: "bg-[#FFEDE0] text-[#FF690B] dark:bg-[#FF690B]/15 dark:text-[#FFB07A]" },
  refunded: {
    label: "Devuelto",
    badge: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    struck: true,
  },
  cancelled: {
    label: "Cancelado",
    badge: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
    struck: true,
  },
};

/**
 * Métodos de pago que el staff puede FIJAR A MANO (contrato
 * `UpdateOrderPaymentDTO` del backend: el PUT solo acepta estos cinco).
 *
 * Ojo, no es la lista de lo que puede LLEGAR: el instrumento real lo escribe el
 * webhook de Stripe con lo que diga `payment_method_details.type`, y ese
 * catálogo es de Stripe y crece solo (link, paypal, bizum, ideal…). Confundir
 * las dos listas es lo que rompía la columna «Pago» — ver `normalizePayment`.
 */
export const PAYMENT_METHODS = ["card", "sepa_debit", "klarna", "sequra", "cash"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Nombre legible de un instrumento de pago. Además de los cinco marcables,
 * incluye los que Stripe devuelve de verdad en esta cuenta y no se podían
 * fijar a mano — `link` es el más común (pagar con la cartera de Stripe: 2 de
 * los 4 pedidos cobrados de producción venían así).
 */
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: "Tarjeta",
  sepa_debit: "SEPA",
  klarna: "Klarna",
  sequra: "seQura",
  cash: "Efectivo",
  link: "Link",
  paypal: "PayPal",
  bizum: "Bizum",
  ideal: "iDEAL",
  bancontact: "Bancontact",
  revolut_pay: "Revolut Pay",
  amazon_pay: "Amazon Pay",
  customer_balance: "Transferencia",
};

/** Métodos que el staff puede fijar a mano (pagos no automáticos de Stripe). */
export const MANUAL_PAYMENT_METHODS: PaymentMethod[] = ["sequra", "cash"];

/** Nombre legible de un instrumento, conocido o no. Nunca devuelve vacío. */
export function paymentMethodLabel(method: string | null | undefined): string | null {
  if (!method) return null;
  // Un método que Stripe estrene mañana se enseña tal cual (`revolut_pay` →
  // «Revolut pay»): informa mucho más que decir que no hay método de pago.
  return PAYMENT_METHOD_LABEL[method] ?? method.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

// ─── Motivos de reembolso ────────────────────────────────────────────────────
// Etiqueta legible ↔ slug del backend (RefundOrderDTO).
export const REFUND_REASONS = [
  "Equivocación",
  "Pausa/Baja",
  "Insatisfecho",
  "Completa con éxito",
  "Atrasos entrega",
  "Cambia tarifa",
] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

const REFUND_REASON_SLUG: Record<RefundReason, string> = {
  Equivocación: "equivocacion",
  "Pausa/Baja": "pausa_baja",
  Insatisfecho: "insatisfecho",
  "Completa con éxito": "completa_exito",
  "Atrasos entrega": "atrasos_entrega",
  "Cambia tarifa": "cambia_tarifa",
};

const SLUG_TO_REFUND_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(REFUND_REASON_SLUG).map(([label, slug]) => [slug, label]),
);

export interface OrderItem {
  id: string;
  product_type?: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: string | number;
}

export interface Order {
  id: string;
  userId: string | null;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  total: number;
  currency: string;
  /**
   * Instrumento real del cobro. Cadena libre a propósito: los cinco de
   * `PAYMENT_METHODS` son los que se pueden marcar a mano, pero Stripe manda
   * los suyos (`link`, `paypal`…) y hay que enseñarlos, no descartarlos.
   * `null` = el pedido no se ha cobrado.
   */
  paymentMethod: string | null;
  origin: string | null;
  refundReason: string | null;
  refundNote: string | null;
  /** Acumulado ya devuelto de este pedido, en euros. */
  refundedAmount: number;
  shippingAddress: Record<string, unknown> | null;
  stripePaymentIntentId: string | null;
  // `has_invoice`/`invoice_number` los añade el backend en el PR #87 (SquatFit),
  // abierto y SIN DESPLEGAR a fecha 31-jul. Contra el API real de hoy el campo
  // no viene en absoluto, así que `null` significa dos cosas a la vez y a
  // propósito: "todavía no se sabe" (backend viejo) y también sirve de valor
  // de partida seguro — nunca se pinta como "sin factura" cuando en realidad
  // es "no tengo ese dato". Ver `normalizeOrder` más abajo.
  hasInvoice: boolean | null;
  invoiceNumber: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrdersListResult {
  orders: Order[];
  total: number;
  /** Lo que hay ahora en la tabla, sin la papelera: cuadra con las filas. */
  counts: Record<string, number>;
  /**
   * El histórico, papelera incluida. Es el número entre paréntesis de cada
   * pestaña. Vacío mientras el backend que lo devuelve no esté desplegado, y en
   * ese caso el paréntesis sencillamente no se pinta.
   */
  countsHistoric: Record<string, number>;
}

export interface OrdersQuery {
  /** «trash» no es un estado del pedido: es la vista de la papelera. */
  status?: OrderStatus | "all" | "trash";
  search?: string;
}

// ─── Factura del pedido ──────────────────────────────────────────────────────
// La factura la emite el backend (pdfkit → GCS), con numeración de serie anual
// SQF-<año>-NNNN, perfil de facturación y desglose de IVA, y la persiste en la
// tabla `invoices`. El back office NO genera facturas: solo pide la que hay o
// manda emitirla. `pdfUrl` es una URL firmada y caduca, así que se pide en el
// momento de descargar y no se guarda.
export interface OrderInvoice {
  invoiceNumber: string;
  orderId: string;
  total: number;
  currency: string;
  issuedAt: string;
  pdfUrl: string;
}

/** Respuesta `InvoiceResult` del backend (contrato cerrado, no hace falta sanear). */
interface InvoiceApi {
  invoice_number: string;
  order_id: string;
  total_amount: number | string;
  /** Puede faltar en pedidos antiguos anteriores a la columna. */
  currency: string | null;
  issued_at: string;
  pdf_url: string;
}

function normalizeInvoice(raw: InvoiceApi): OrderInvoice {
  return {
    invoiceNumber: raw.invoice_number,
    orderId: raw.order_id,
    total: toNumber(raw.total_amount),
    currency: (raw.currency ?? "eur").toLowerCase(),
    issuedAt: raw.issued_at,
    pdfUrl: raw.pdf_url,
  };
}

/**
 * Error tipado de `POST/GET …/invoice`: el back office necesita distinguir el
 * código para explicar el motivo (no un «error» genérico) — 400 = el pedido no
 * está en un estado facturable; 409 = el titular ejerció el derecho al olvido
 * y sus datos fiscales ya no existen. `message` YA es la frase completa en
 * español que arma el backend (`BadRequestException`/`ConflictException`), no
 * hace falta traducir nada aquí, solo no perder el código para que la vista
 * elija el tono correcto.
 */
export class OrderInvoiceError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "OrderInvoiceError";
    this.status = status;
  }

  get isNotFacturable(): boolean {
    return this.status === 400;
  }

  get isForgottenRight(): boolean {
    return this.status === 409;
  }
}

export interface RefundOrderPayload {
  orderId: string;
  reason: RefundReason;
  note?: string;
  amountCents?: number;
}

// ─── Envío del pedido ────────────────────────────────────────────────────────
// Correos tiene la API bloqueada (su OAuth sigue rechazando nuestras
// credenciales), así que el equipo envía los libros por su cuenta y anota aquí
// transportista + nº de seguimiento. El backend deja el pedido en «Enviado» y
// avisa al cliente por email con el enlace de seguimiento.

// El contrato es con **Correos**, no con Correos Express (son dos empresas
// distintas). Se ofrecía «Correos Express» y además era el valor por defecto,
// así que un envío registrado sin fijarse salía con el transportista
// equivocado en el email al cliente. Mismo cambio en el DTO del backend.
export const SHIPMENT_CARRIERS = ["correos", "otro"] as const;
export type ShipmentCarrier = (typeof SHIPMENT_CARRIERS)[number];

/**
 * `correos_express` ya no se ofrece, pero se mantiene etiquetado por si algún
 * envío antiguo lo tuviera guardado: mejor decir «Correos» que nombrar a un
 * transportista con el que no se trabaja.
 */
export const CARRIER_LABEL: Record<string, string> = {
  correos: "Correos",
  correos_express: "Correos",
  otro: "Otro transportista",
};

export interface ShipmentEvent {
  id: string;
  event: string;
  detail: Record<string, unknown> | null;
  actorName: string | null;
  createdAt: string;
}

export interface Shipment {
  shipmentId: string;
  orderId: string;
  /** 'manual' = anotado por el equipo; 'api' = alta en el WS de Correos. */
  source: "manual" | "api";
  carrier: ShipmentCarrier;
  carrierLabel: string;
  carrierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  notifiedAt: string | null;
  createdByName: string | null;
  createdAt: string;
  events: ShipmentEvent[];
}

export interface RegisterShipmentPayload {
  orderId: string;
  carrier: ShipmentCarrier;
  carrierName?: string;
  trackingNumber: string;
  shippedAt?: string;
  trackingUrl?: string;
  notify?: boolean;
  note?: string;
}

export interface UpdateShipmentPayload {
  orderId: string;
  carrier?: ShipmentCarrier;
  carrierName?: string;
  trackingNumber?: string;
  shippedAt?: string;
  trackingUrl?: string;
  notify?: boolean;
  reason?: string;
}

function normalizeShipment(raw: any): Shipment {
  const carrier = (SHIPMENT_CARRIERS as readonly string[]).includes(raw?.carrier)
    ? (raw.carrier as ShipmentCarrier)
    : "correos";
  return {
    shipmentId: String(raw?.shipment_id ?? ""),
    orderId: String(raw?.order_id ?? ""),
    source: raw?.source === "manual" ? "manual" : "api",
    carrier,
    carrierLabel: raw?.carrier_label ?? CARRIER_LABEL[carrier],
    carrierName: raw?.carrier_name ?? null,
    trackingNumber: raw?.shipping_number ?? null,
    trackingUrl: raw?.tracking_url ?? null,
    status: raw?.status ?? "shipped",
    shippedAt: raw?.shipped_at ?? null,
    deliveredAt: raw?.delivered_at ?? null,
    notifiedAt: raw?.notified_at ?? null,
    createdByName: raw?.created_by_name ?? null,
    createdAt: raw?.created_at ?? new Date().toISOString(),
    events: Array.isArray(raw?.events)
      ? raw.events.map((e: any) => ({
          id: String(e.id),
          event: String(e.event),
          detail: e.detail ?? null,
          actorName: e.actor_name ?? null,
          createdAt: e.created_at,
        }))
      : [],
  };
}

function toNumber(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function normalizeStatus(v: unknown): OrderStatus {
  const s = String(v ?? "").toLowerCase();
  return (ORDER_STATUSES as readonly string[]).includes(s) ? (s as OrderStatus) : "pending";
}

/**
 * El instrumento de pago TAL COMO viene, sin filtrarlo por una lista blanca.
 *
 * Antes esto era `PAYMENT_METHODS.includes(s) ? s : null`, y ahí estaba el
 * fallo de la columna «Pago»: el webhook guarda lo que dice Stripe
 * (`payment_method_details.type`), que incluye valores que NO están entre los
 * cinco marcables a mano. Un pedido cobrado con `link` llegaba con su método
 * bien guardado en la base de datos, el listado lo devolvía bien, y el back
 * office lo tiraba a la basura y pintaba «Sin marcar» — que significa lo
 * contrario: que nadie ha cobrado. En producción pasaba en la mitad de los
 * pedidos cobrados.
 *
 * `null` queda reservado para lo que de verdad no tiene método: un pedido
 * pendiente que nunca llegó a pagarse.
 */
function normalizePayment(v: unknown): string | null {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s || null;
}

export function normalizeOrder(raw: any): Order {
  return {
    id: String(raw.id),
    userId: raw.user_id ?? null,
    customerName: raw.customer_name ?? "(sin nombre)",
    customerEmail: raw.customer_email ?? "",
    status: normalizeStatus(raw.status),
    total: toNumber(raw.total_amount),
    currency: (raw.currency ?? "eur").toLowerCase(),
    paymentMethod: normalizePayment(raw.payment_method),
    origin: raw.origin ?? null,
    refundedAmount: toNumber(raw.refunded_amount ?? 0),
    refundReason: raw.refund_reason ?? null,
    refundNote: raw.refund_note ?? null,
    shippingAddress: raw.shipping_address ?? null,
    stripePaymentIntentId: raw.stripe_payment_intent_id ?? null,
    // Tolerante a que el campo no exista todavía (backend sin desplegar): solo
    // se toma como `true`/`false` de verdad si el backend manda un booleano;
    // si no viene, `null` ("no lo sabemos"), nunca "false" por defecto.
    hasInvoice: typeof raw.has_invoice === "boolean" ? raw.has_invoice : null,
    invoiceNumber: typeof raw.invoice_number === "string" ? raw.invoice_number : null,
    items: Array.isArray(raw.items) ? raw.items : [],
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updated_at ?? raw.updatedAt ?? raw.created_at ?? new Date().toISOString(),
  };
}

/** Motivo de reembolso legible (traduce el slug del backend). */
export function formatRefundReason(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "—";
  const t = raw.trim();
  return SLUG_TO_REFUND_LABEL[t] ?? t;
}

export class OrdersService {
  private static authHeaders(): Record<string, string> {
    const token = getAuthToken() ?? (typeof window !== "undefined" ? localStorage.getItem("authToken") : null);
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private static async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT),
    });
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error("Sesión caducada");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? body.error ?? `Error ${res.status}`);
    }
    return res.json();
  }

  static async list(query?: OrdersQuery): Promise<OrdersListResult> {
    // Solo params del QueryOrdersDTO (forbidNonWhitelisted): status, search, limit.
    const params = new URLSearchParams();
    // «Papelera» no es un estado más: es una vista aparte del backend, así que
    // va por su propio parámetro y no por `status`.
    if (query?.status === "trash") params.set("trash", "true");
    else if (query?.status && query.status !== "all") params.set("status", query.status);
    if (query?.search) params.set("search", query.search);
    params.set("limit", "200");
    const qs = params.toString();
    const data = await this.request<any>(`/api/v1/admin-panel/orders${qs ? `?${qs}` : ""}`, {
      headers: this.authHeaders(),
    });
    const rows: any[] = Array.isArray(data) ? data : (data.data ?? data.orders ?? []);
    return {
      orders: rows.map(normalizeOrder),
      total: Number(data?.total) || rows.length,
      counts: data?.counts ?? {},
      countsHistoric: data?.countsHistoric ?? {},
    };
  }

  /**
   * Manda pedidos a la papelera. Borrado blando: los esconde del listado y se
   * pueden restaurar; nada se pierde.
   */
  static async bulkTrash(orderIds: string[]): Promise<{ message: string }> {
    return OrdersService.bulkAction("bulk-trash", orderIds);
  }

  /** Los devuelve a la lista. */
  static async bulkRestore(orderIds: string[]): Promise<{ message: string }> {
    return OrdersService.bulkAction("bulk-restore", orderIds);
  }

  /**
   * Borrado DEFINITIVO, solo desde la papelera. El backend rechaza el lote
   * entero si alguno tiene factura emitida (obligación fiscal) y dice cuáles.
   */
  static async bulkDelete(orderIds: string[]): Promise<{ message: string }> {
    return OrdersService.bulkAction("bulk-delete", orderIds);
  }

  /**
   * `OrdersService.` y no `this.`, a propósito.
   *
   * Estos tres métodos se pasan sueltos como callback —`accionEnLote(
   * OrdersService.bulkTrash)`—, y al desreferenciarlos de la clase se pierde el
   * `this`: la llamada reventaba con «Cannot read properties of undefined
   * (reading 'bulkAction')» justo al pulsar el botón. Nombrando la clase, el
   * método funciona igual lo llames como lo llames.
   */
  private static async bulkAction(accion: string, orderIds: string[]): Promise<{ message: string }> {
    if (!orderIds.length) throw new Error("No has seleccionado ningún pedido.");
    const res = await fetch(`${API_BASE_URL}/api/v1/admin-panel/orders/${accion}`, {
      method: "POST",
      headers: OrdersService.authHeaders(),
      body: JSON.stringify({ order_ids: orderIds }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error("Sesión caducada");
    }
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.message ?? payload.error ?? `Error ${res.status}`);
    }
    return res.json().catch(() => ({ message: "Hecho" }));
  }

  static async getById(id: string): Promise<Order> {
    const data = await this.request<any>(`/api/v1/admin-panel/orders/${id}`, { headers: this.authHeaders() });
    return normalizeOrder(data?.data ?? data);
  }

  static async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const data = await this.request<any>(`/api/v1/admin-panel/orders/${id}/status`, {
      method: "PUT",
      headers: this.authHeaders(),
      body: JSON.stringify({ status }),
    });
    return normalizeOrder(data?.data ?? data);
  }

  static async updatePayment(id: string, payment_method: PaymentMethod): Promise<Order> {
    const data = await this.request<any>(`/api/v1/admin-panel/orders/${id}/payment`, {
      method: "PUT",
      headers: this.authHeaders(),
      body: JSON.stringify({ payment_method }),
    });
    return normalizeOrder(data?.data ?? data);
  }

  /** Envía el email al cliente según el estado del pedido (o el indicado). */
  static async sendEmail(id: string, status?: OrderStatus): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/v1/admin-panel/orders/${id}/email`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(status ? { status } : {}),
    });
  }

  /**
   * Reembolsa (o marca como devuelto) un pedido. El backend exige `reason` como
   * SLUG cerrado; la nota va aparte en `note`.
   */
  static async refundOrder({ orderId, reason, note, amountCents }: RefundOrderPayload): Promise<{ message: string }> {
    if (!reason) throw new Error("El motivo del reembolso es obligatorio.");
    const body: Record<string, unknown> = { reason: REFUND_REASON_SLUG[reason] };
    if (note?.trim()) body.note = note.trim();
    if (typeof amountCents === "number" && amountCents > 0) body.amount_cents = amountCents;

    const res = await fetch(`${API_BASE_URL}/api/v1/admin-panel/orders/${orderId}/refund`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error("Sesión caducada");
    }
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.message ?? payload.error ?? `Error ${res.status} al procesar el reembolso`);
    }
    return res.json().catch(() => ({ message: "Reembolso procesado" }));
  }

  // ─── Factura ──────────────────────────────────────────────────────────────

  /** Factura ya emitida del pedido; `null` si todavía no tiene ninguna. */
  static async getInvoice(orderId: string): Promise<OrderInvoice | null> {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin-panel/orders/${orderId}/invoice`, {
      headers: this.authHeaders(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error("Sesión caducada");
    }
    // 404 = el pedido aún no tiene factura: no es un error de la vista.
    if (res.status === 404) return null;
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new OrderInvoiceError(res.status, body.message ?? `Error ${res.status}`);
    }
    return normalizeInvoice((await res.json()) as InvoiceApi);
  }

  /**
   * Emite la factura del pedido y devuelve la URL firmada del PDF. Es
   * idempotente por defecto (`regenerate=false`): si ya existe devuelve la
   * misma sin gastar otro número de serie. `regenerate: true` rehace el PDF
   * conservando el número — de momento no lo pide ningún botón del back
   * office, solo se deja cableado en el servicio siguiendo el contrato.
   *
   * 400 si el pedido no está en un estado facturable (falta pago confirmado);
   * 409 si el titular ejerció el derecho al olvido (sus datos fiscales ya no
   * existen y la factura no se puede emitir ni rehacer). Ambos vienen con
   * `OrderInvoiceError` para que la vista distinga el motivo.
   */
  static async generateInvoice(orderId: string, opts?: { regenerate?: boolean }): Promise<OrderInvoice> {
    const qs = opts?.regenerate ? "?regenerate=true" : "";
    const res = await fetch(`${API_BASE_URL}/api/v1/admin-panel/orders/${orderId}/invoice${qs}`, {
      method: "POST",
      headers: this.authHeaders(),
      body: "{}",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error("Sesión caducada");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new OrderInvoiceError(res.status, body.message ?? `Error ${res.status} al emitir la factura`);
    }
    return normalizeInvoice((await res.json()) as InvoiceApi);
  }

  // ─── Envío ────────────────────────────────────────────────────────────────

  /** Envío del pedido con su historial; `null` si aún no tiene ninguno. */
  static async getShipment(orderId: string): Promise<Shipment | null> {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin-panel/orders/${orderId}/shipment/detail`, {
      headers: this.authHeaders(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error("Sesión caducada");
    }
    // 404 = el pedido todavía no tiene envío: no es un error de la vista.
    if (res.status === 404) return null;
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? `Error ${res.status}`);
    }
    return normalizeShipment(await res.json());
  }

  /** Anota un envío hecho a mano y (salvo que se desactive) avisa al cliente. */
  static async registerShipment({
    orderId,
    carrier,
    carrierName,
    trackingNumber,
    shippedAt,
    trackingUrl,
    notify,
    note,
  }: RegisterShipmentPayload): Promise<Shipment> {
    const body: Record<string, unknown> = {
      carrier,
      tracking_number: trackingNumber.trim(),
      notify: notify !== false,
    };
    if (carrierName?.trim()) body.carrier_name = carrierName.trim();
    if (shippedAt) body.shipped_at = shippedAt;
    if (trackingUrl?.trim()) body.tracking_url = trackingUrl.trim();
    if (note?.trim()) body.note = note.trim();

    const data = await this.request<any>(`/api/v1/admin-panel/orders/${orderId}/shipment/manual`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    return normalizeShipment(data);
  }

  /** Corrige el envío (nº de seguimiento, transportista o fecha); deja rastro. */
  static async updateShipment({
    orderId,
    carrier,
    carrierName,
    trackingNumber,
    shippedAt,
    trackingUrl,
    notify,
    reason,
  }: UpdateShipmentPayload): Promise<Shipment> {
    const body: Record<string, unknown> = {};
    if (carrier) body.carrier = carrier;
    if (carrierName !== undefined) body.carrier_name = carrierName.trim();
    if (trackingNumber?.trim()) body.tracking_number = trackingNumber.trim();
    if (shippedAt) body.shipped_at = shippedAt;
    if (trackingUrl !== undefined) body.tracking_url = trackingUrl.trim();
    if (notify) body.notify = true;
    if (reason?.trim()) body.reason = reason.trim();

    const data = await this.request<any>(`/api/v1/admin-panel/orders/${orderId}/shipment/manual`, {
      method: "PUT",
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    return normalizeShipment(data);
  }

  /** Marca el envío como entregado y cierra el pedido. */
  static async markShipmentDelivered(orderId: string, deliveredAt?: string): Promise<Shipment> {
    const data = await this.request<any>(`/api/v1/admin-panel/orders/${orderId}/shipment/delivered`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(deliveredAt ? { delivered_at: deliveredAt } : {}),
    });
    return normalizeShipment(data);
  }

  /** Reenvía al cliente el email con el nº de seguimiento. */
  static async resendShipmentNotice(orderId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/v1/admin-panel/orders/${orderId}/shipment/notify`, {
      method: "POST",
      headers: this.authHeaders(),
      body: "{}",
    });
  }
}

/** Texto legible de cada evento del historial de envío. */
export function shipmentEventLabel(event: ShipmentEvent): string {
  const detail = (event.detail ?? {}) as Record<string, any>;
  switch (event.event) {
    case "created":
      return `Envío registrado (${detail.tracking_number ?? "sin número"})`;
    case "corrected": {
      const changed = detail.changed ?? {};
      const parts = Object.entries(changed).map(([field, v]: [string, any]) => {
        const label = field === "tracking_number" ? "nº de seguimiento" : field.replace(/_/g, " ");
        return `${label}: ${v?.from ?? "—"} → ${v?.to ?? "—"}`;
      });
      return `Corregido · ${parts.join("; ") || "sin cambios"}${detail.reason ? ` (${detail.reason})` : ""}`;
    }
    case "notified":
      return `Aviso enviado a ${detail.to ?? "el cliente"}`;
    case "delivered":
      return "Marcado como entregado";
    case "api_override":
      return "Alta en Correos forzada sobre este envío manual";
    default:
      return event.event;
  }
}

// ─── Formato de fecha relativa (diseño: «Hace 3 horas» / «Ayer» / «3 Dic 2025») ─
export function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Justo ahora";
  if (min < 60) return `Hace ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return `Ayer, ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  if (days < 7) return `Hace ${days} días`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Resumen legible de los productos del pedido para la columna «Productos».
 *
 * Ya no recorta a «los dos primeros +N»: ese recorte existía porque la celda
 * era de una sola línea y no cabía más. Ahora la celda ajusta el texto y salta
 * de línea (norma «formato de tablas»), así que se enseñan todos — saber qué
 * lleva el pedido es justo lo que hay que mirar para prepararlo.
 */
export function itemsSummary(items: OrderItem[]): string {
  if (!items.length) return "—";
  return items.map((i) => (i.quantity > 1 ? `${i.product_name} ×${i.quantity}` : i.product_name)).join(", ");
}

/**
 * Importe de un pedido. Delega en la norma de tablas para que Pedidos, Packs,
 * Catálogo y las tarjetas de inicio pinten la misma cifra igual (punto decimal,
 * símbolo detrás). Se conserva el nombre porque lo usan la exportación y la
 * ficha del pedido.
 */
export function formatOrderPrice(total: number, currency: string): string {
  return formatearImporte(total, currency);
}
