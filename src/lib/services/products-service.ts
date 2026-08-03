import { handleUnauthorized } from "@/lib/api-client";
import { getAuthToken } from "@/lib/auth/auth-utils";
import { formatearImporte } from "@/lib/formato-de-tablas";
import { API_BASE_URL } from "@/lib/services/api-base";

/** Corta peticiones colgadas para que la UI no quede en isLoading para siempre. */
const REQUEST_TIMEOUT = 12000;

// ============================================================================
// CATÁLOGO DE PRODUCTOS (tabla `products`) — mapeo de concesiones (Fase 14.2)
// ----------------------------------------------------------------------------
// El backend (Fase 9.7 + Fase 12, EN PROD desde el 21-jul-2026) expone:
//   • GET /api/v1/admin-panel/products                     (lista completa)
//   • PUT /api/v1/admin-panel/products/:id                 (editar; whitelist)
// Cada producto puede CONCEDER algo al comprarse, vía `grant_type` + `grant_id`:
//   • course          → grant_id = id de `course`  → user_has_course.expires_at
//   • program         → grant_id = id de `course`  → programa TMV (user_has_adviser)
//   • book            → grant_id = id de `book`     → user_has_books
//   • pack            → grant_id = id de `book/pack` → user_has_books (pack)
//   • digital_library → sin grant_id                → suscripción de biblioteca
//   • null            → sin concesión automática (Premium/consultas se cobran sin grant)
// `access_months` = tramo/duración del acceso (null = permanente).
//
// Verificado contra prod 21-jul-2026: 49 productos; 37 con precio>0 y sin
// grant_type (aviso de mapeo pendiente). grant_type en uso: course, book,
// digital_library, program.
// ============================================================================

export const GRANT_TYPES = ["course", "program", "book", "pack", "digital_library"] as const;
export type GrantType = (typeof GRANT_TYPES)[number];

export const GRANT_TYPE_LABEL: Record<GrantType, string> = {
  course: "Curso",
  program: "Programa (TMV)",
  book: "Libro",
  pack: "Pack de libros",
  digital_library: "Biblioteca digital",
};

/** ¿El grant_type necesita un `grant_id` (curso/libro/pack)? */
export function grantNeedsTarget(grantType: GrantType | null): boolean {
  return grantType === "course" || grantType === "program" || grantType === "book" || grantType === "pack";
}

/** De qué endpoint sale el selector de `grant_id` según el `grant_type`. */
export function grantTargetKind(grantType: GrantType | null): "course" | "book" | "pack" | null {
  if (grantType === "course" || grantType === "program") return "course";
  if (grantType === "book") return "book";
  if (grantType === "pack") return "pack";
  return null;
}

export interface ProductApi {
  id: string;
  name: string;
  description?: string | null;
  price: string | number | null;
  currency?: string | null;
  type?: string | null;
  billing_period?: string | null;
  stripe_price_id?: string | null;
  active?: boolean;
  area?: string | null;
  access_months?: number | null;
  drip_mode?: string | null;
  drip_config?: Record<string, unknown> | null;
  grant_type?: string | null;
  grant_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  type: string;
  billingPeriod?: string;
  active: boolean;
  area?: string;
  accessMonths: number | null;
  dripMode: string;
  dripConfig: Record<string, unknown>;
  grantType: GrantType | null;
  grantId: string | null;
  /** Precio>0 y sin `grant_type`: la compra no concede nada automáticamente. */
  needsMapping: boolean;
}

/** Opción del selector de `grant_id` (curso/libro/pack). */
export interface GrantTarget {
  id: string;
  label: string;
}

/** Patch aceptado por el PUT (whitelist del UpdateProductDTO). */
export interface UpdateProductPatch {
  grant_type?: GrantType | null;
  grant_id?: string | null;
  access_months?: number | null;
}

function toNumber(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function normalizeGrantType(v: unknown): GrantType | null {
  const s = String(v ?? "").toLowerCase();
  return (GRANT_TYPES as readonly string[]).includes(s) ? (s as GrantType) : null;
}

export function normalizeProduct(raw: ProductApi): Product {
  const price = toNumber(raw.price);
  const grantType = normalizeGrantType(raw.grant_type);
  return {
    id: String(raw.id),
    name: raw.name ?? "(sin nombre)",
    description: raw.description ?? undefined,
    price,
    currency: (raw.currency ?? "eur").toLowerCase(),
    type: raw.type ?? "product",
    billingPeriod: raw.billing_period ?? undefined,
    active: Boolean(raw.active),
    area: raw.area ?? undefined,
    accessMonths: raw.access_months ?? null,
    dripMode: String(raw.drip_mode ?? "none"),
    dripConfig: raw.drip_config ?? {},
    grantType,
    grantId: raw.grant_id ?? null,
    needsMapping: price > 0 && !grantType,
  };
}

export class ProductsService {
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
    return res.json();
  }

  private static toArray(data: unknown): any[] {
    if (Array.isArray(data)) return data;
    const o = data as Record<string, unknown>;
    return (o?.data as any[]) ?? (o?.products as any[]) ?? [];
  }

  static async list(): Promise<Product[]> {
    const data = await this.request<any>(`/api/v1/admin-panel/products`, { headers: this.authHeaders() });
    return this.toArray(data).map(normalizeProduct);
  }

  static async update(id: string, patch: UpdateProductPatch): Promise<Product> {
    const raw = await this.request<any>(`/api/v1/admin-panel/products/${id}`, {
      method: "PUT",
      headers: this.authHeaders(),
      body: JSON.stringify(patch),
    });
    return normalizeProduct(raw?.data ?? raw);
  }

  /** Carga las opciones del selector de `grant_id` según el tipo de concesión. */
  static async getGrantTargets(kind: "course" | "book" | "pack"): Promise<GrantTarget[]> {
    if (kind === "course") {
      const data = await this.request<any>(`/api/v1/admin-panel/courses`, { headers: this.authHeaders() });
      return this.toArray(data).map((c) => ({ id: String(c.id), label: c.title ?? c.name ?? c.id }));
    }
    if (kind === "book") {
      const data = await this.request<any>(`/api/v1/book/all`, { headers: this.authHeaders() });
      return this.toArray(data).map((b) => ({ id: String(b.id), label: b.title ?? b.name ?? b.id }));
    }
    // pack
    const data = await this.request<any>(`/api/v1/book/packs`, { headers: this.authHeaders() });
    return this.toArray(data).map((p) => ({ id: String(p.id), label: p.name ?? p.title ?? p.id }));
  }
}

/** Etiqueta de tramo/duración a partir de `access_months`. */
export function accessLabel(accessMonths: number | null): string {
  if (accessMonths == null) return "Permanente";
  if (accessMonths === 12) return "Anual (12 meses)";
  if (accessMonths === 1) return "Mensual (1 mes)";
  return `${accessMonths} meses`;
}

/**
 * Precio del catálogo. Delega en la norma «formato de tablas» para que la misma
 * cifra se lea igual en Productos, Packs y Pedidos.
 */
export function formatPrice(price: number, currency: string): string {
  return formatearImporte(price, currency);
}
