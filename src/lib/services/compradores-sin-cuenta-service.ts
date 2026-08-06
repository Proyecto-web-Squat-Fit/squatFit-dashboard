import { getAuthToken } from "@/lib/auth/auth-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

// ============================================================================
// COMPRADORES SIN CUENTA
// ----------------------------------------------------------------------------
// `GET /api/v1/admin-panel/sales/compradores-sin-cuenta`. Un enlace de pago sin
// metadata cobra, no concede nada y NO CREA LA CUENTA. Medido el 6-ago: 15
// cobros de una vez en 180 días, 11.938,05 €, de gente que no está en la base.
//
// Cada fila trae el enlace por el que entró — el backend lo saca dando el rodeo
// payment_intent → checkout.sessions → payment_link—, que es el único dato que
// dice QUÉ compró esa persona. No se deduce del importe: 797 € es tanto
// Entreno como Nutrición, y adivinar ahí es regalar o negar producto a ciegas.
// ============================================================================
export const COMPRADORES_SIN_CUENTA_ENDPOINT = "/api/v1/admin-panel/sales/compradores-sin-cuenta";

export interface CompradorSinCuenta {
  email: string;
  importe: number;
  moneda: string;
  fecha: string;
  charge_id: string;
  payment_intent_id: string | null;
  enlace: {
    id: string;
    nombre: string | null;
    catalog_product_id: string | null;
    product_type: string | null;
  } | null;
  producto: string | null;
}

export interface ResumenCompradoresSinCuenta {
  dias: number;
  cobros_mirados: number;
  sin_cuenta: number;
  importe_total: number;
  compradores: CompradorSinCuenta[];
}

export class CompradoresSinCuentaService {
  static async listar(dias = 180): Promise<ResumenCompradoresSinCuenta> {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE_URL}${COMPRADORES_SIN_CUENTA_ENDPOINT}?dias=${dias}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(
        res.status === 403
          ? "Tu rol no tiene permiso para ver esta lista."
          : `No se pudo cargar la lista (${res.status}).`,
      );
    }
    return res.json();
  }
}

export function enEuros(importe: number, moneda: string): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: moneda || "EUR" }).format(importe);
}
