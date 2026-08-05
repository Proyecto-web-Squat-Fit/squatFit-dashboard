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
//   • POST /api/v1/admin-panel/notifications/read   (marcar leídas; body opcional { id })
//     OJO: `id` en SINGULAR, y una sola por llamada. Aquí ponía `{ ids }` y era
//     falso —el DTO del backend solo declara `id`—, que es de donde salió el
//     fallo de que «marcar solo esta» no funcionara nunca.
//
// Sondeo 20-jul-2026: ambos responden 404 → NOTIFICATIONS_API_READY = false.
// Mientras tanto la campana funciona con datos de ejemplo (el estado leído/no
// leído se guarda en un store local de sesión, igual que los leads de ejemplo).
//
// Tipos de evento que enlaza cada notificación (los del backend, ver abajo):
//   • lead_nuevo     → lead nuevo            → /dashboard/leads
//   • pago           → pago recibido         → /dashboard/ventas
//   • form           → formulario recibido   → /dashboard/leads
//   • sequra         → pedido seQura         → /dashboard/ventas
//   • renovacion     → programa que vence    → ficha del cliente
//   • checkout_caido → nadie puede comprar   → /dashboard/pedidos
// El GET devuelve un `cta_url` por notificación, que se traduce a ruta del
// panel (`rutaDelPanel`); si no se reconoce, se deriva del tipo.
// ============================================================================

/** ENCENDIDO 21-jul-2026 por el coordinador: GET/POST /admin-panel/notifications verificados vivos en prod (401, ya no 404). */
export const NOTIFICATIONS_API_READY = true;

/** Cada cuánto sondea la campana (ms). */
export const NOTIFICATIONS_POLL_MS = 45_000;

// ---------------------------------------------------------------------------
// LOS TIPOS SON LOS DEL BACKEND, NO LOS QUE INVENTAMOS AQUÍ (4-ago-2026)
// ---------------------------------------------------------------------------
// Esta lista decía `lead_new | payment | precall_form | sequra_order`, y el
// backend emite `lead_nuevo | pago | form | sequra | renovacion |
// checkout_caido`: CERO coincidencias. Como `normalizeNotification` cae a
// «lead_new» ante un tipo desconocido, no se veía roto — se veía MAL: las 177
// notificaciones de producción salían todas con el icono de lead nuevo, fueran
// un pago, un pedido de seQura o un aviso de renovación.
//
// Se adopta el vocabulario del backend, que es quien las escribe. Los cuatro
// nombres viejos se siguen aceptando (ALIAS_LEGADO) para no romper nada que
// venga con ellos.
export const NOTIFICATION_TYPES = ["lead_nuevo", "pago", "form", "sequra", "renovacion", "checkout_caido"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Nombres que usaba solo el panel, por si llega alguno con ellos. */
const ALIAS_LEGADO = new Map<string, NotificationType>([
  ["lead_new", "lead_nuevo"],
  ["payment", "pago"],
  ["precall_form", "form"],
  ["sequra_order", "sequra"],
]);

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  lead_nuevo: "Lead nuevo",
  pago: "Pago",
  form: "Formulario",
  sequra: "Pedido seQura",
  renovacion: "Renovación",
  checkout_caido: "Tienda caída",
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

/**
 * Lo que llega del GET tal cual, sin prometer forma: el backend manda
 * `cta_url`/`is_read` y en el pasado ha mandado `href`/`read`, así que todo se
 * lee a la defensiva y se normaliza en un solo sitio.
 */
type NotificacionCruda = Record<string, any>;

/** Ruta por defecto para cada tipo de evento cuando no hay enlace utilizable. */
function defaultHref(type: NotificationType, resourceId?: string): string {
  switch (type) {
    case "lead_nuevo":
    case "form":
      return "/dashboard/leads";
    case "pago":
    case "sequra":
      return resourceId ? `/dashboard/ventas?ref=${encodeURIComponent(resourceId)}` : "/dashboard/ventas";
    case "renovacion":
      return "/dashboard/alumnos";
    case "checkout_caido":
      return "/dashboard/pedidos";
  }
}

// ---------------------------------------------------------------------------
// EL `cta_url` DEL BACKEND NO SON RUTAS DE ESTE PANEL
// ---------------------------------------------------------------------------
// El backend guarda enlaces con SU vocabulario, y este panel nunca los leía
// (buscaba `href` o `url`, y la columna se llama `cta_url`). Medido en
// producción el 4-ago: 172 de 177 notificaciones traen enlace, y de los cinco
// prefijos que usan, TRES no existen aquí:
//
//   /clientes/<id>            120 avisos  →  /dashboard/alumnos/<id>
//   /leads/<id>                26         →  /dashboard/leads  (no hay ficha)
//   /forms/submissions/<id>    23         →  /dashboard/leads
//   /pedidos                    2         →  /dashboard/pedidos
//   /users/<id>                 1         →  /dashboard/alumnos/<id>
//
// Así que no basta con leer el campo: hay que traducirlo. Se hace AQUÍ y no en
// el backend a propósito — traducir en el panel arregla de golpe las 177 filas
// que ya existen, y cambiarlo allí solo serviría para las futuras.
// Lo que no se sepa traducir cae al destino por tipo, nunca a un 404.
// El tipo va en la variable y no en `new Map<…>`: con el genérico ahí, la regla
// `func-call-spacing` lee el `) => string>(` como una llamada mal espaciada.
type DestinoDePrefijo = (id?: string) => string;
const RUTA_POR_PREFIJO: Map<string, DestinoDePrefijo> = new Map([
  ["clientes", (id) => (id ? `/dashboard/alumnos/${id}` : "/dashboard/alumnos")],
  ["users", (id) => (id ? `/dashboard/alumnos/${id}` : "/dashboard/alumnos")],
  ["leads", () => "/dashboard/leads"],
  ["forms", () => "/dashboard/leads"],
  ["pedidos", () => "/dashboard/pedidos"],
]);

/** Traduce un `cta_url` del backend a una ruta real, o null si no se reconoce. */
export function rutaDelPanel(ctaUrl?: string | null): string | null {
  if (!ctaUrl || typeof ctaUrl !== "string") return null;
  // Un enlace que ya apunte al panel se respeta tal cual.
  if (ctaUrl.startsWith("/dashboard/")) return ctaUrl;
  // Solo rutas propias: un absoluto de otro sitio no se sigue.
  if (!ctaUrl.startsWith("/")) return null;

  const partes = ctaUrl.split("/").filter(Boolean);
  const destino = RUTA_POR_PREFIJO.get(partes[0]);
  if (!destino) return null;
  // El id es el último segmento; `/forms/submissions/<id>` mete uno intermedio.
  return destino(partes.length > 1 ? partes[partes.length - 1] : undefined);
}

/** El tipo que manda el backend, o su alias viejo, o el de por defecto. */
function resolverTipo(bruto: unknown): NotificationType {
  const nombre = String(bruto ?? "");
  if (NOTIFICATION_TYPES.includes(nombre as NotificationType)) return nombre as NotificationType;
  return ALIAS_LEGADO.get(nombre) ?? "lead_nuevo";
}

/** Primer enlace utilizable: el explícito, el `cta_url` traducido, o el del tipo. */
function resolverHref(raw: NotificacionCruda, type: NotificationType): string {
  return (
    raw.href ??
    raw.url ??
    rutaDelPanel(raw.cta_url ?? raw.ctaUrl) ??
    defaultHref(type, raw.resource_id ?? raw.resourceId)
  );
}

/** Id estable; si la API no lo trae, uno derivado para no repetir claves. */
function resolverId(raw: NotificacionCruda): string {
  return String(raw.id ?? raw.notification_id ?? `n-${raw.created_at ?? Math.random()}`);
}

/** Normalización tolerante: acepta snake/camel y deriva href/tipo si faltan. */
function normalizeNotification(raw: NotificacionCruda): AdminNotification {
  const type = resolverTipo(raw.type);
  return {
    id: resolverId(raw),
    type,
    title: raw.title ?? NOTIFICATION_TYPE_LABEL[type],
    body: raw.body ?? raw.message ?? undefined,
    href: resolverHref(raw, type),
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
      type: "lead_nuevo",
      title: "Lead nuevo desde Instagram",
      body: "Lucía Ferrer — interesada en el Programa",
      href: "/dashboard/leads",
      read: false,
      created_at: minutesAgo(12),
    },
    {
      id: "sample-n2",
      type: "form",
      title: "Formulario de prellamada recibido",
      body: "Marco Díaz completó el formulario antes de su llamada",
      href: "/dashboard/leads",
      read: false,
      created_at: minutesAgo(55),
    },
    {
      id: "sample-n3",
      type: "pago",
      title: "Pago recibido",
      body: "349 € — Curso de fuerza (Stripe)",
      href: "/dashboard/ventas",
      read: false,
      created_at: minutesAgo(180),
    },
    {
      id: "sample-n4",
      type: "sequra",
      title: "Pedido seQura confirmado",
      body: "Asesoría trimestral — pago fraccionado aprobado",
      href: "/dashboard/ventas",
      read: true,
      created_at: minutesAgo(60 * 26),
    },
    {
      id: "sample-n5",
      type: "lead_nuevo",
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

  /**
   * Marca como leída UNA notificación, o TODAS si no se pasa id.
   *
   * Era `ids?: string[]` y mandaba `{ ids }`, y ese plural nunca ha funcionado:
   * el backend acepta `{ id }` en singular (MarkStaffNotificationReadDTO, con
   * `@IsUUID(4) id?: string`) y el ValidationPipe global va con
   * `forbidNonWhitelisted: true`, así que un body con `ids` se rechazaba con
   * 400 antes de llegar al handler. Como el hook hace actualización optimista,
   * el fallo no se veía: la notificación se pintaba leída, el POST fallaba, y
   * al siguiente sondeo volvía a aparecer sin leer.
   *
   * O sea que de los dos caminos, el único que llegaba a hacer algo era el
   * destructivo —body vacío = marcar TODAS—, y el de «marca solo esta» no.
   * Se arregla aquí, en el cliente, porque el backend ya expone lo que hace
   * falta y así no hay que desplegar nada.
   *
   * OJO al usarlo: el estado leído es COMPARTIDO por todo el staff (así lo
   * documenta el propio endpoint). Marcar todas no es «ocultármelas a mí», es
   * vaciarle la cola al equipo entero.
   */
  static async markRead(id?: string): Promise<void> {
    if (!NOTIFICATIONS_API_READY) {
      getSampleStore().forEach((n) => {
        if (!id || n.id === id) n.read = true;
      });
      return;
    }
    await this.request("/api/v1/admin-panel/notifications/read", {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(id ? { id } : {}),
    });
  }
}
