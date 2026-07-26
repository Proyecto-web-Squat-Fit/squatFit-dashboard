import { getAuthToken } from "@/lib/auth/auth-utils";

// ============================================================================
// Servicio de PEDIDOS (administración).
// Endpoints: /api/v1/admin-panel/orders
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://squatfit-api-cyrc2g3zra-no.a.run.app";
const REQUEST_TIMEOUT = 15000;

/** Estados de administración (leyenda del back office). */
export type PedidoStatus = "pending" | "processing" | "completed" | "refunded" | "cancelled";

export interface PedidoItem {
  id: string;
  product_type: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: string;
}

export interface PedidoApi {
  id: string;
  user_id: string;
  customer_name: string | null;
  customer_email: string | null;
  status: PedidoStatus;
  total_amount: string;
  currency: string;
  payment_method: string | null;
  origin: string | null;
  refund_reason: string | null;
  shipping_address?: PedidoShippingAddress | null;
  stripe_payment_intent_id: string | null;
  items: PedidoItem[];
  created_at: string;
  updated_at: string;
}

/** Dirección de envío del pedido (JSON del formulario del checkout de la web). */
export interface PedidoShippingAddress {
  firstName?: string;
  lastName?: string;
  address?: string;
  apartment?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  phone?: string;
  dni_cif?: string;
  notes?: string;
}

export interface Pedido {
  id: string;
  /** ID corto para mostrar (#a1b2c3d4) */
  shortId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  status: PedidoStatus;
  total: number;
  currency: string;
  paymentMethod: string | null;
  origin: string;
  refundReason: string | null;
  shippingAddress: PedidoShippingAddress | null;
  hasStripePayment: boolean;
  items: PedidoItem[];
  /** Resumen "Asesorías M, Cursos H" para la columna Productos */
  productsSummary: string;
  createdAt: string;
}

export interface PedidosCounts {
  all: number;
  pending: number;
  processing: number;
  completed: number;
  refunded: number;
  cancelled: number;
}

export interface PedidosListResult {
  pedidos: Pedido[];
  total: number;
  counts: PedidosCounts;
}

export interface GetPedidosParams {
  status?: PedidoStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export class PedidosService {
  private static getDefaultHeaders(token: string | null): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (typeof window !== "undefined") {
      try {
        const t = localStorage.getItem("authToken");
        if (t) headers.Authorization = `Bearer ${t}`;
      } catch {
        // ignore
      }
    }
    return headers;
  }

  private static async handleError(response: Response): Promise<never> {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) throw new Error("Unauthorized");
    throw new Error(err.message ?? err.error ?? `Error ${response.status}`);
  }

  private static async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: { ...this.getDefaultHeaders(token), ...(options.headers as Record<string, string>) },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) await this.handleError(res);
      return res.json();
    } catch (e) {
      clearTimeout(timeoutId);
      if (e instanceof Error && e.name === "AbortError") throw new Error("La petición tardó demasiado");
      throw e;
    }
  }

  private static transform(api: PedidoApi): Pedido {
    const summary =
      api.items.length > 0
        ? api.items.map((i) => (i.quantity > 1 ? `${i.product_name} ×${i.quantity}` : i.product_name)).join(", ")
        : "—";
    return {
      id: api.id,
      shortId: `#${api.id.slice(0, 8)}`,
      userId: api.user_id,
      customerName: api.customer_name ?? "Sin nombre",
      customerEmail: api.customer_email ?? "—",
      status: api.status,
      total: parseFloat(api.total_amount) || 0,
      currency: api.currency?.toUpperCase() === "EUR" ? "€" : (api.currency ?? "€"),
      paymentMethod: api.payment_method,
      origin: api.origin ?? "Desconocido",
      refundReason: api.refund_reason,
      shippingAddress: api.shipping_address ?? null,
      hasStripePayment: !!api.stripe_payment_intent_id,
      items: api.items,
      productsSummary: summary,
      createdAt: api.created_at,
    };
  }

  static async getPedidos(params: GetPedidosParams = {}): Promise<PedidosListResult> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.search) qs.set("search", params.search);
    qs.set("page", String(params.page ?? 1));
    qs.set("limit", String(params.limit ?? 50));
    const res = await this.makeRequest<{ data: PedidoApi[]; total: number; counts: PedidosCounts }>(
      `/api/v1/admin-panel/orders?${qs.toString()}`,
    );
    return {
      pedidos: (res.data ?? []).map((p) => this.transform(p)),
      total: res.total ?? 0,
      counts: res.counts ?? { all: 0, pending: 0, processing: 0, completed: 0, refunded: 0, cancelled: 0 },
    };
  }

  static async getPedido(id: string): Promise<Pedido> {
    const res = await this.makeRequest<PedidoApi>(`/api/v1/admin-panel/orders/${id}`);
    return this.transform(res);
  }

  static async updateStatus(id: string, status: PedidoStatus): Promise<void> {
    await this.makeRequest(`/api/v1/admin-panel/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  static async updatePaymentMethod(id: string, paymentMethod: string): Promise<void> {
    await this.makeRequest(`/api/v1/admin-panel/orders/${id}/payment`, {
      method: "PUT",
      body: JSON.stringify({ payment_method: paymentMethod }),
    });
  }

  static async sendStatusEmail(id: string, status?: PedidoStatus): Promise<{ message: string }> {
    return await this.makeRequest(`/api/v1/admin-panel/orders/${id}/email`, {
      method: "POST",
      body: JSON.stringify(status ? { status } : {}),
    });
  }

  static async refund(id: string, reason: string, amountCents?: number): Promise<{ message: string }> {
    return await this.makeRequest(`/api/v1/admin-panel/orders/${id}/refund`, {
      method: "POST",
      body: JSON.stringify({ reason, ...(amountCents ? { amount_cents: amountCents } : {}) }),
    });
  }
}
