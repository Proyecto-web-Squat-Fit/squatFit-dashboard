import { getAuthToken } from "@/lib/auth/auth-utils";

// ============================================================================
// PLANES DE ASESORÍA (tabla `suscription_plan`, así escrita en el backend)
// ----------------------------------------------------------------------------
// El backend expone SOLO LECTURA (PR #52, ya en prod):
//   • GET /api/v1/admin-panel/advice-plans
// Ver admin-panel.controller.ts (método getAdvicePlans) y su propio comentario:
// "Planes de `suscription_plan` (el módulo legacy de asesorías) para completar
// el inventario del catálogo unificado del panel — no viven en `products` y
// no tienen stripe_price_id/grant_type. Sin crear/editar/borrar desde aquí a
// propósito: la gestión sigue siendo la del módulo de Asesorías."
//
// DTO exacto devuelto (AdvicePlanSummary, admin-panel.interface.ts):
//   id: string
//   name: string
//   description: string | null
//   price: string            (decimal como string, así lo devuelve pg)
//   duration_days: number
//   is_active: boolean
//   created_at: Date         (JSON → string ISO)
//   updated_at: Date         (JSON → string ISO)
//
// No hay paginación ni filtros en el backend: devuelve el array completo
// ordenado por `name` ASC. La búsqueda y el filtro de estado son 100% cliente.
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://squatfit-api-985835765452.europe-southwest1.run.app";
const REQUEST_TIMEOUT = 12000;

/** Forma EXACTA de la respuesta del backend (AdvicePlanSummary). */
export interface AdvicePlan {
  id: string;
  name: string;
  description: string | null;
  price: string;
  duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Etiqueta legible para `duration_days`, igual de espíritu que `accessLabel` de products-service. */
export function durationLabel(durationDays: number): string {
  if (durationDays === 30) return "Mensual (30 días)";
  if (durationDays === 90) return "Trimestral (90 días)";
  if (durationDays === 180) return "Semestral (180 días)";
  if (durationDays === 365) return "Anual (365 días)";
  return `${durationDays} días`;
}

/** Formatea `price` (string decimal) como moneda EUR (única moneda de este módulo legacy). */
export function formatAdvicePrice(price: string): string {
  const n = Number(price);
  if (!Number.isFinite(n)) return price;
  return `${n.toFixed(2)} €`;
}

/**
 * 401/403 en `advice-plans` NO se trata como sesión caducada: a fecha de hoy
 * el middleware de permisos del backend responde 401 a TODOS los roles
 * (incluido admin) en esta ruta porque a la migración de #52 le falta la
 * clave de permiso `advice-plans` (bug conocido, hay una migración en curso
 * en `fix/permiso-advice-plans`). Si tratáramos este 401 como sesión caducada
 * (vía `handleUnauthorized`) cerraríamos la sesión de todo el que abra esta
 * pestaña por error de OTRO endpoint. En su lugar se lanza un error propio
 * que la vista puede distinguir de "no hay planes" o de un fallo de red.
 */
export class AdvicePlansPermissionError extends Error {
  constructor(message = "No tienes permiso para ver los planes de asesoría.") {
    super(message);
    this.name = "AdvicePlansPermissionError";
  }
}

export class AdvicePlansService {
  private static authHeaders(): Record<string, string> {
    const token = getAuthToken() ?? (typeof window !== "undefined" ? localStorage.getItem("authToken") : null);
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  static async list(): Promise<AdvicePlan[]> {
    const res = await fetch(`${API_BASE_URL}/api/v1/admin-panel/advice-plans`, {
      headers: this.authHeaders(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });
    if (res.status === 401 || res.status === 403) {
      // No es sesión caducada: ver AdvicePlansPermissionError arriba. No se
      // llama a handleUnauthorized() a propósito — no debe cerrar sesión.
      throw new AdvicePlansPermissionError();
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? body.error ?? `Error ${res.status}`);
    }
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? (data as AdvicePlan[]) : [];
  }
}
