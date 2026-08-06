import { getAuthToken } from "@/lib/auth/auth-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

// ============================================================================
// DECISIONES DE ACCESO TRAS UN REEMBOLSO
// ----------------------------------------------------------------------------
// Desde el 6-ago el webhook de Stripe ya no retira el acceso por su cuenta.
// Cuando llega un reembolso que no traía decisión —típicamente porque se hizo
// desde el propio Stripe— queda aquí esperando a que alguien diga qué hacer.
// Mientras tanto el cliente CONSERVA su acceso.
// ============================================================================
export const REFUND_DECISIONS_ENDPOINT = "/api/v1/admin-panel/sales/refund-decisions";

export type DecisionAcceso = "revocar" | "mantener" | "hasta_fecha";

export interface DecisionPendiente {
  id: string;
  charge_id: string;
  payment_intent_id: string | null;
  order_id: string | null;
  user_id: string | null;
  amount_refunded_cents: number | null;
  currency: string | null;
  resumen: string | null;
  created_at: string;
}

function cabeceras() {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export class RefundDecisionsService {
  static async pendientes(): Promise<{ total: number; pendientes: DecisionPendiente[] }> {
    const res = await fetch(`${API_BASE_URL}${REFUND_DECISIONS_ENDPOINT}`, {
      headers: cabeceras(),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(
        res.status === 403
          ? "Tu rol no tiene permiso para ver los reembolsos."
          : `No se pudieron cargar los reembolsos pendientes (${res.status}).`,
      );
    }
    return res.json();
  }

  static async resolver(
    id: string,
    decision: DecisionAcceso,
    retenerHasta?: string,
  ): Promise<{ message: string; detalle: string }> {
    const res = await fetch(`${API_BASE_URL}${REFUND_DECISIONS_ENDPOINT}/${id}/resolve`, {
      method: "POST",
      headers: cabeceras(),
      body: JSON.stringify({
        decision,
        ...(decision === "hasta_fecha" && retenerHasta ? { retener_hasta: retenerHasta } : {}),
      }),
    });
    const cuerpo = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(cuerpo?.message ?? `No se pudo aplicar la decisión (${res.status}).`);
    }
    return cuerpo;
  }
}

/** 48445 → «484,45 €». Lo lee gente en español. */
export function importeEnEuros(centimos: number | null, moneda: string | null): string {
  if (centimos == null) return "importe desconocido";
  // Intl y no una regex de miles: el linter marca esa regex como insegura, y
  // esto además respeta el separador que espera un lector español.
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: (moneda ?? "eur").toUpperCase(),
  }).format(centimos / 100);
}
