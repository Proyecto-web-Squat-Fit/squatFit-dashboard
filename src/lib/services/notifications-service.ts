import { handleUnauthorized } from "@/lib/api-client";
import { getAuthToken } from "@/lib/auth/auth-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

/** Corta peticiones colgadas para que la UI no quede en isLoading para siempre. */
const REQUEST_TIMEOUT = 12000;

// ============================================================================
// NOTIFICACIONES DEL PANEL (campana de la barra superior · Fase 10)
// ----------------------------------------------------------------------------
// Contrato esperado de Fase 9 (backend en paralelo — AÚN NO publicado):
//   • GET  /api/v1/admin-panel/notifications        (últimos eventos + unread)
//   • POST /api/v1/admin-panel/notifications/read   (marcar leídas; body opcional { ids })
//
// Sondeo 20-jul-2026: ambos responden 404 → NOTIFICATIONS_API_READY = false.
// Mientras tanto la campana funciona con datos de ejemplo (el estado leído/no
// leído se guarda en un store local de sesión, igual que los leads de ejemplo).
//
// Tipos de evento que enlaza cada notificación:
//   • lead_new      → lead nuevo            → /dashboard/leads
//   • payment       → pago recibido         → /dashboard/ventas
//   • precall_form  → formulario prellamada → /dashboard/leads
//   • sequra_order  → pedido seQura         → /dashboard/ventas
// El GET puede devolver un `href` propio por notificación; si no, se deriva
// del tipo (+ resource_id cuando aplique).
// ============================================================================

/** ENCENDIDO 21-jul-2026 por el coordinador: GET/POST /admin-panel/notifications verificados vivos en prod (401, ya no 404). */
export const NOTIFICATIONS_API_READY = true;

/** Cada cuánto sondea la campana (ms). */
export const NOTIFICATIONS_POLL_MS = 45_000;

export const NOTIFICATION_TYPES = ["lead_new", "payment", "precall_form", "sequra_order"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  lead_new: "Lead nuevo",
  payment: "Pago",
  precall_form: "Formulario de prellamada",
  sequra_order: "Pedido seQura",
};

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  /** Enlace al recurso del evento (lead, venta…). */
  href: string;
  read: boolean;
  created_at: string;
}

/** Ruta por defecto para cada tipo de evento cuando la API no manda `href`. */
function defaultHref(type: NotificationType, resourceId?: string): string {
  switch (type) {
    case "lead_new":
    case "precall_form":
      return "/dashboard/leads";
    case "payment":
    case "sequra_order":
      return resourceId ? `/dashboard/ventas?ref=${encodeURIComponent(resourceId)}` : "/dashboard/ventas";
  }
}

/** Normalización tolerante: acepta snake/camel y deriva href/tipo si faltan. */
function normalizeNotification(raw: any): AdminNotification {
  const type: NotificationType = NOTIFICATION_TYPES.includes(raw.type) ? raw.type : "lead_new";
  return {
    id: String(raw.id ?? raw.notification_id ?? `n-${raw.created_at ?? Math.random()}`),
    type,
    title: raw.title ?? NOTIFICATION_TYPE_LABEL[type],
    body: raw.body ?? raw.message ?? undefined,
    href: raw.href ?? raw.url ?? defaultHref(type, raw.resource_id ?? raw.resourceId),
    read: Boolean(raw.read ?? raw.is_read ?? raw.read_at),
    created_at: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Datos de ejemplo (mientras Fase 9 no publica). Cubren los 4 tipos de evento
// con varias no leídas para que el badge y el desplegable se puedan revisar.
// ---------------------------------------------------------------------------

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

let sampleStore: AdminNotification[] | null = null;

function getSampleStore(): AdminNotification[] {
  sampleStore ??= [
    {
      id: "sample-n1",
      type: "lead_new",
      title: "Lead nuevo desde Instagram",
      body: "Lucía Ferrer — interesada en el Programa",
      href: "/dashboard/leads",
      read: false,
      created_at: minutesAgo(12),
    },
    {
      id: "sample-n2",
      type: "precall_form",
      title: "Formulario de prellamada recibido",
      body: "Marco Díaz completó el formulario antes de su llamada",
      href: "/dashboard/leads",
      read: false,
      created_at: minutesAgo(55),
    },
    {
      id: "sample-n3",
      type: "payment",
      title: "Pago recibido",
      body: "349 € — Curso de fuerza (Stripe)",
      href: "/dashboard/ventas",
      read: false,
      created_at: minutesAgo(180),
    },
    {
      id: "sample-n4",
      type: "sequra_order",
      title: "Pedido seQura confirmado",
      body: "Asesoría trimestral — pago fraccionado aprobado",
      href: "/dashboard/ventas",
      read: true,
      created_at: minutesAgo(60 * 26),
    },
    {
      id: "sample-n5",
      type: "lead_new",
      title: "Lead nuevo desde la web",
      body: "Sara Ortiz — formulario de contacto",
      href: "/dashboard/leads",
      read: true,
      created_at: minutesAgo(60 * 30),
    },
  ];
  return sampleStore;
}

export class NotificationsService {
  private static authHeaders(json = true): Record<string, string> {
    const token = getAuthToken() ?? (typeof window !== "undefined" ? localStorage.getItem("authToken") : null);
    return {
      ...(json ? { "Content-Type": "application/json" } : {}),
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
    // Los POST (p. ej. marcar leídas) pueden responder 204/cuerpo vacío.
    return res.json().catch(() => ({})) as Promise<T>;
  }

  /** Últimos eventos, más recientes primero. */
  static async getNotifications(): Promise<AdminNotification[]> {
    if (!NOTIFICATIONS_API_READY) {
      // Copias frescas: el store es mutable y react-query no vería los cambios
      // si devolviéramos las mismas referencias (misma lección que en leads).
      return getSampleStore()
        .map((n) => ({ ...n }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    const data = await this.request<any>("/api/v1/admin-panel/notifications", { headers: this.authHeaders() });
    const raw: any[] = Array.isArray(data) ? data : (data.data ?? data.notifications ?? []);
    return raw.map(normalizeNotification).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  /** Marca como leídas: todas si no se pasan ids. */
  static async markRead(ids?: string[]): Promise<void> {
    if (!NOTIFICATIONS_API_READY) {
      getSampleStore().forEach((n) => {
        if (!ids || ids.includes(n.id)) n.read = true;
      });
      return;
    }
    await this.request("/api/v1/admin-panel/notifications/read", {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(ids?.length ? { ids } : {}),
    });
  }
}
