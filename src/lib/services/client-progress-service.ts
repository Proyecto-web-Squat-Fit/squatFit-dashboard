import { getAuthToken } from "@/lib/auth/auth-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

// ============================================================================
// PROGRESO DE UN CLIENTE — pestaña «Progreso» de la ficha del alumno
// (tablero F3, Back office nº 138; Fase B del plan «Agente de chats + ficha»)
// ----------------------------------------------------------------------------
// Endpoint: GET /api/v1/admin-panel/users/:id/progress
//
// Los datos son la «Tabla progreso clientes» (Google Sheet) que el backend
// importó a `client_progress`, más el histórico de IMC. La hoja NO tiene
// esquema fijo: cada registro trae sus columnas en `data` y la respuesta lista
// en `fields` las que de verdad aparecen. Por eso aquí NO se tipan columnas
// concretas (cintura, cadera…): se pintan las que vengan.
//
// ⚠️ El endpoint está en un PR sin desplegar (SquatFit#63). Hasta que se
// despliegue, la llamada devolverá 404 de ruta y la pestaña lo dirá tal cual.
// ============================================================================

const REQUEST_TIMEOUT = 15000;

/** Un registro de la Tabla progreso: fecha + peso + el resto de columnas. */
export interface ClientProgressRecord {
  id: string;
  /** YYYY-MM-DD (el backend lo formatea en SQL, sin desfase de zona). */
  recorded_on: string;
  weight_kg: number | null;
  /** Medidas, hitos y notas de la hoja. Claves variables → ver `fields`. */
  data: Record<string, string>;
}

export interface ClientProgressSummary {
  total: number;
  first_recorded_on: string | null;
  last_recorded_on: string | null;
  first_weight_kg: number | null;
  last_weight_kg: number | null;
  /** Negativo = ha bajado. Siempre sobre la serie completa. */
  weight_delta_kg: number | null;
  target_weight_kg: number | null;
  current_weight_kg: number | null;
}

export interface ClientImcPoint {
  imc: number;
  date: string;
}

export interface ClientProgress {
  user_id: string;
  summary: ClientProgressSummary;
  /** Columnas presentes en los `data`, ya ordenadas por el backend. */
  fields: string[];
  /** Serie ascendente por fecha, lista para graficar. */
  records: ClientProgressRecord[];
  imc_history: ClientImcPoint[];
  /** true si se recortaron los registros más antiguos por el `limit`. */
  truncated: boolean;
}

/**
 * Error de la API que CONSERVA el código HTTP.
 *
 * Sin esto la pestaña no puede distinguir «no tienes permiso» (401/403) de
 * «este alumno no tiene medidas» ni de «se ha caído la red» — que es
 * exactamente la confusión que ya se coló con los planes de asesoría.
 * El resto de servicios del BO lanzan `new Error("Unauthorized")` a pelo y por
 * eso la UI no puede reaccionar bien; aquí se hace con el status a mano.
 */
export class ClientProgressError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = "ClientProgressError";
    this.status = status;
  }

  /** El staff está autenticado pero su rol no puede ver este dato. */
  get isForbidden(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** El endpoint todavía no existe en el backend desplegado. */
  get isNotFound(): boolean {
    return this.status === 404;
  }
}

export const ClientProgressService = {
  async getProgress(userId: string): Promise<ClientProgress> {
    const token = getAuthToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/api/v1/admin-panel/users/${userId}/progress`, {
        headers,
        signal: controller.signal,
      });
    } catch (e) {
      // Aborto por timeout o fallo de red: no hay status que mirar.
      const aborted = e instanceof DOMException && e.name === "AbortError";
      throw new ClientProgressError(
        aborted ? "La petición ha tardado demasiado y se ha cancelado." : "No se ha podido contactar con el servidor.",
        null,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new ClientProgressError(body.message ?? `Error ${res.status}`, res.status);
    }

    return (await res.json()) as ClientProgress;
  },
};
