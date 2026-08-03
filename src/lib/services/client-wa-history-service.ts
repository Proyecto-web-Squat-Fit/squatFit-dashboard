import { getAuthToken } from "@/lib/auth/auth-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

// ============================================================================
// HISTORIAL DE WHATSAPP DE UN CLIENTE — pestaña «Chats» de la ficha del
// alumno (tablero F3 nº 139, Fase C del plan «Agente de chats + ficha»).
// ----------------------------------------------------------------------------
// Endpoint: GET /api/v1/admin-panel/wa-history/:userId — SOLO LECTURA. No hay
// ni debe haber POST/PUT/DELETE aquí: responder desde la ficha es otra fase
// del plan CRM con su propio permiso.
//
// Paginación por CURSOR, no por página: sin `cursor` llegan los mensajes MÁS
// RECIENTES (por donde se abre un hilo), ya en orden ASCENDENTE dentro de esa
// página. `page.next_cursor` trae la página ANTERIOR (más antigua); es opaco,
// no se interpreta ni se construye aquí, solo se reenvía tal cual.
//
// Lo normal HOY es `chats: []`: el emparejamiento de teléfono↔cuenta aún no
// se ha ejecutado en producción (677 chats, 1 solo con dueño). Eso es un 200
// válido, no un error — la pestaña tiene que distinguirlo de un fallo real.
//
// El permiso (`wa-history`, migración 20260728170000) es solo de admin hoy;
// si no está aplicada, el middleware falla cerrado con 401.
// ============================================================================

const REQUEST_TIMEOUT = 15000;

/** Búsqueda mínima aceptada por el backend; por debajo de esto responde 400. */
export const WA_HISTORY_MIN_SEARCH = 2;
export const WA_HISTORY_DEFAULT_LIMIT = 50;
export const WA_HISTORY_MAX_LIMIT = 200;

export interface WaChatSummary {
  /** Posición del chat en `chats[]`; los mensajes lo referencian por aquí (`chat_ref`). */
  ref: number;
  /** Nombre del contacto tal cual venía en el export; null si el chat solo traía el número. */
  display_name: string | null;
  /** Mensajes de este chat en total (no solo los de la página actual). */
  message_count: number;
  first_message_at: string | null;
  last_message_at: string | null;
}

export type WaMessageDirection = "in" | "out" | "sys";
export type WaMessageKind = "text" | "audio" | "image" | "video" | "doc" | "system";

export interface WaMessageItem {
  id: string;
  /** Índice en `chats[]` (ver `WaChatSummary.ref`). */
  chat_ref: number;
  sent_at: string;
  /** in = lo escribió el cliente · out = lo escribió Squad Fit · sys = aviso de WhatsApp. */
  direction: WaMessageDirection;
  kind: WaMessageKind;
  /** Texto del mensaje; null en audios y adjuntos. */
  body: string | null;
  /** Transcripción del audio (whisper del export), si la hay. */
  transcript: string | null;
  /** true en audios SIN transcripción: hay que decirlo, no dejar la burbuja vacía. */
  transcript_pending: boolean;
  /** Llevaba adjunto (foto/vídeo/documento); el contenido no está en la BD. */
  has_media: boolean;
}

export interface WaHistorySummary {
  total_messages: number;
  incoming: number;
  outgoing: number;
  first_message_at: string | null;
  last_message_at: string | null;
  counts_by_kind: Record<string, number>;
  audios: number;
  audios_without_transcript: number;
}

export interface WaHistorySearchInfo {
  q: string;
  /** Coincidencias en TODO el historial del cliente, no solo en la página. */
  matches: number;
}

export interface WaHistoryPage {
  limit: number;
  returned: number;
  /** Quedan mensajes MÁS ANTIGUOS que los de esta página. */
  has_more: boolean;
  /** Cursor opaco de la página anterior (más antigua); null si no queda más. */
  next_cursor: string | null;
}

export interface UserWaHistoryResponse {
  user_id: string;
  read_only: true;
  chats: WaChatSummary[];
  summary: WaHistorySummary;
  /** Solo viene si se pidió `q`. */
  search: WaHistorySearchInfo | null;
  /** Ventana del hilo, ascendente por fecha (lista para pintar de arriba a abajo). */
  messages: WaMessageItem[];
  page: WaHistoryPage;
}

export interface GetWaHistoryParams {
  limit?: number;
  /** Cursor opaco de `page.next_cursor`. No interpretar ni construir a mano. */
  cursor?: string | null;
  /** Mínimo 2 caracteres; no se manda si es más corta (el backend respondería 400). */
  q?: string | null;
}

/**
 * Error de la API que CONSERVA el código HTTP, igual que `ClientProgressError`:
 * sin esto la pestaña no puede distinguir «sin permiso» (401) de «este cliente
 * no tiene chats enlazados» (200 con `chats: []`, que NO es un error) ni de
 * «se ha caído la red».
 */
export class ClientWaHistoryError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null) {
    super(message);
    this.name = "ClientWaHistoryError";
    this.status = status;
  }

  /** Autenticado pero sin el permiso `wa-history` (o migración sin aplicar: falla cerrado). */
  get isForbidden(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** El usuario no existe para el backend. */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** Cursor inválido o búsqueda demasiado corta: error nuestro, no del servidor. */
  get isBadRequest(): boolean {
    return this.status === 400;
  }
}

export const ClientWaHistoryService = {
  async getHistory(userId: string, params: GetWaHistoryParams = {}): Promise<UserWaHistoryResponse> {
    const token = getAuthToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const qs = new URLSearchParams();
    if (params.limit) qs.set("limit", String(Math.min(params.limit, WA_HISTORY_MAX_LIMIT)));
    if (params.cursor) qs.set("cursor", params.cursor);
    if (params.q && params.q.trim().length >= WA_HISTORY_MIN_SEARCH) qs.set("q", params.q.trim());
    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/api/v1/admin-panel/wa-history/${encodeURIComponent(userId)}${suffix}`, {
        headers,
        signal: controller.signal,
      });
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "AbortError";
      throw new ClientWaHistoryError(
        aborted ? "La petición ha tardado demasiado y se ha cancelado." : "No se ha podido contactar con el servidor.",
        null,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new ClientWaHistoryError(body.message ?? `Error ${res.status}`, res.status);
    }

    return (await res.json()) as UserWaHistoryResponse;
  },
};
