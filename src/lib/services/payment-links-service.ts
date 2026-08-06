import { getAuthToken } from "@/lib/auth/auth-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

// ============================================================================
// ENLACES DE PAGO
// ----------------------------------------------------------------------------
// `GET /api/v1/admin-panel/payment-links` — los enlaces activos de Stripe,
// leídos en vivo. Hoy los closers los buscan entre sitios distintos; aquí están
// todos, y sobre todo se ve cuáles cobran SIN dar acceso.
//
// Un enlace sin metadata cae en `reportUnmappedCheckout`: no concede nada, no
// crea la cuenta y solo avisa a la campana. De ahí salen los compradores que
// pagan y no existen en la base.
// ============================================================================
export const PAYMENT_LINKS_ENDPOINT = "/api/v1/admin-panel/payment-links";

export interface EnlaceDePago {
  id: string;
  url: string;
  nombre: string;
  importe: number;
  moneda: string;
  /** «Pago único» o «133,00 € cada mes», ya formateado por el backend. */
  modalidad: string;
  /** Si el webhook concederá el producto solo. */
  concede_acceso: boolean;
  /** Claves de metadata que faltan para que conceda. */
  falta: string[];
  metadata: Record<string, string>;
  producto: { id: string; name: string } | null;
}

export interface ResumenEnlacesDePago {
  total: number;
  conceden: number;
  no_conceden: number;
  enlaces: EnlaceDePago[];
}

export class PaymentLinksService {
  static async listar(): Promise<ResumenEnlacesDePago> {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}${PAYMENT_LINKS_ENDPOINT}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(
        res.status === 403
          ? "Tu rol no tiene permiso para ver los enlaces de pago."
          : `No se pudieron cargar los enlaces (${res.status}).`,
      );
    }
    return (await res.json()) as ResumenEnlacesDePago;
  }
}

/**
 * El «plan» del selector. Se agrupa por el producto del catálogo cuando la
 * metadata lo dice, y por el nombre del enlace cuando no — que hoy es siempre.
 * Así la pantalla sirve ya, y en cuanto se ponga la metadata se reordena sola
 * por producto real sin tocar nada aquí.
 */
export function planDe(enlace: EnlaceDePago): string {
  return enlace.producto?.name ?? enlace.nombre;
}

export function agruparPorPlan(enlaces: EnlaceDePago[]): { plan: string; enlaces: EnlaceDePago[] }[] {
  const mapa = new Map<string, EnlaceDePago[]>();
  for (const e of enlaces) {
    const plan = planDe(e);
    const lista = mapa.get(plan);
    if (lista) lista.push(e);
    else mapa.set(plan, [e]);
  }
  return [...mapa.entries()]
    .map(([plan, lista]) => ({
      plan,
      // De más caro a más barato: el closer sube o baja desde el precio de
      // referencia, no al revés.
      enlaces: [...lista].sort((a, b) => b.importe - a.importe),
    }))
    .sort((a, b) => a.plan.localeCompare(b.plan, "es"));
}
