import { handleUnauthorized } from "@/lib/api-client";
import { getAuthToken } from "@/lib/auth/auth-utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://squatfit-api-985835765452.europe-southwest1.run.app";
/** Corta peticiones colgadas para que la UI no quede en isLoading para siempre. */
const REQUEST_TIMEOUT = 12000;

// ============================================================================
// CRM — LEADS (13.13 · Fase 10)
// ----------------------------------------------------------------------------
// Backend (Fase 9 + Fase 12, EN PROD desde el 21-jul-2026, rev 00201-6sq):
//   • GET    /api/v1/admin-panel/leads                (lista + counts por estado)
//   • POST   /api/v1/admin-panel/leads                (crear)
//   • PUT    /api/v1/admin-panel/leads/:id            (actualizar; incl. estado y objeción)
//   • DELETE /api/v1/admin-panel/leads/:id            (borrar)
//   • POST   /api/v1/admin-panel/leads/import         (importar CSV; multipart)
//   • POST   /api/v1/admin-panel/leads/:id/convert    (convertir en cliente)
//
// Contrato v2 (Fase 9, YA desplegado):
//   • status ampliado: `realizada` (llamada hecha), `esperando_pago` y
//     `seguimiento` (repesca) — 8 estados en total.
//   • campos por lead: `objection`, `intake_date`, `converted_user_id`,
//     `is_customer`, `assigned_to` (uuid) + `assigned_to_name` (display),
//     `origin` (web|instagram|email|youtube|otro).
//   • `convert` responde `{ lead, linked, converted_user_id, warning? }`:
//     `warning` presente cuando NO encuentra usuario con el email/teléfono.
//
// Verificado contra prod 21-jul-2026 (token admin): `GET /admin-panel/leads`
// → 200 con los 8 estados en `counts`; `convert` → existe (404 "Lead no
// encontrado" con id inexistente).
//
// `POST leads/:id/notes` (auditoría julio, low-sev "carrera en notas de
// lead"): añadido en el backend para concatenar la nota en una sola
// sentencia SQL, sin el read-modify-write que perdía notas con dos ediciones
// a la vez. `addNote()` de abajo lo prueba primero y solo cae al PUT viejo
// (mismo riesgo de carrera) si la ruta responde 404 — o sea, hasta que ese
// backend esté desplegado. Verificar contra prod antes de dar esto por hecho.
//
// OJO: la tabla `leads` está VACÍA en prod (total=0) hasta que se corra el
// import de ~160 leads (`scripts/import-leads.ts --commit`). Hasta entonces
// Pipeline/Repesca salen vacíos con datos reales; usar `?demo=1` para revisar.
//
// Estrategia de encendido:
//   • `?demo=1` en /dashboard/leads fuerza los datos de ejemplo (cubren ambos
//     kanbans) aunque la API real esté activa.
// ============================================================================

/** Interruptor global: `true` con el backend de leads desplegado. */
export const LEADS_API_READY = true; // encendido 20-jul-2026 (backend lote 4 en prod);

/**
 * Escritura del contrato v2 (Fase 9): estados `realizada`/`esperando_pago`/
 * `seguimiento` y campo `objection` en el PUT. Encendido manual 21-jul-2026
 * (backend v2 en prod, rev 00201). Se mantiene la autodetección como refuerzo,
 * pero con la tabla vacía (total=0) el autodetect no puede disparar, así que
 * este flag garantiza que la escritura v2 quede activa.
 */
export const LEADS_V2_WRITE_READY = true;

/**
 * `POST /admin-panel/leads/:id/convert` — DESPLEGADO en prod (rev 00201,
 * 21-jul-2026). Devuelve `{ lead, linked, converted_user_id, warning? }`.
 */
export const LEAD_CONVERT_READY = true;

/**
 * Pipeline «estilo GHL» (Bloque 1 del plan CRM-GHL): valor de la oportunidad
 * (`opportunity_value` €), motivo de pérdida (`lost_reason`) y etiquetas
 * (`tags`). Backend en la rama `feature/crm-pipeline-completo`, aún SIN
 * mergear/desplegar. Encender al desplegar; mientras tanto la autodetección
 * (campos presentes en el GET) también lo activa sola.
 */
export const LEAD_PIPELINE_V3_READY = true;

/** Columnas del kanban «Pipeline comercial» (en orden). */
export const PIPELINE_STATES = [
  "Nuevo",
  "Contactado",
  "Agendado",
  "Llamada hecha",
  "Esperando pago",
  "Ganado",
  "Perdido",
] as const;

/**
 * Todos los estados posibles de un lead. «Seguimiento» no es columna del
 * pipeline: es el aparcadero de repesca (junto a «Perdido») y se asigna desde
 * el panel del lead. Decisión Fase 10: el contrato de Fase 9 solo lista
 * `realizada`/`esperando_pago` como estados nuevos; si `seguimiento` no llega
 * a existir en backend, simplemente ningún lead tendrá ese estado y la
 * repesca mostrará solo «Perdido» (sin romper nada).
 */
export const LEAD_STATES = [...PIPELINE_STATES, "Seguimiento"] as const;
export type LeadState = (typeof LEAD_STATES)[number];

/** Estados que entran en el kanban «Repesca». */
export const REPESCA_STATES: readonly LeadState[] = ["Perdido", "Seguimiento"];

/** Orígenes soportados por el filtro (enum backend: web|instagram|email|youtube|sorteo|otro).
 *
 * «sorteo» es la landing del WordPress viejo (`/sorteo-programa-tu-mejor-version`),
 * que sigue trayendo gente meses después de cerrarse. Va aparte de «web» porque
 * es justo lo que hay que poder medir: cuánta cola arrastra. */
export const LEAD_SOURCES = ["web", "ig", "email", "youtube", "sorteo", "otro"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  web: "Web",
  ig: "Instagram",
  email: "Email",
  youtube: "YouTube",
  sorteo: "Sorteo",
  otro: "Otro",
};

/** Objeciones de venta (contrato Fase 9) — agrupan el kanban «Repesca». */
export const LEAD_OBJECTIONS = ["precio", "timing", "confianza", "presupuesto", "otros"] as const;
export type LeadObjection = (typeof LEAD_OBJECTIONS)[number];

export const LEAD_OBJECTION_LABEL: Record<LeadObjection, string> = {
  precio: "Precio",
  timing: "Timing / Pospone",
  confianza: "Confianza",
  presupuesto: "Presupuesto",
  otros: "Otros",
};

/**
 * Motivo de pérdida (Bloque 1.3): se pide al arrastrar a «Perdido» y alimenta
 * la analítica. Distinto de la objeción (que se registra DURANTE la venta).
 */
export const LEAD_LOST_REASONS = ["precio", "no_contesta", "timing", "competencia", "otro"] as const;
export type LeadLostReason = (typeof LEAD_LOST_REASONS)[number];

export const LEAD_LOST_REASON_LABEL: Record<LeadLostReason, string> = {
  precio: "Precio",
  no_contesta: "No contesta",
  timing: "Timing / Pospone",
  competencia: "Competencia",
  otro: "Otro",
};

/**
 * Motivo de pérdida → objeción de la Repesca: al perder un lead SIN objeción
 * registrada, se rellena también `objection` para que la Repesca lo agrupe.
 */
export const LOST_REASON_TO_OBJECTION: Record<LeadLostReason, LeadObjection> = {
  precio: "precio",
  no_contesta: "otros",
  timing: "timing",
  competencia: "otros",
  otro: "otros",
};

export interface LeadNote {
  id: string;
  body: string;
  author?: string;
  created_at: string;
}

export interface LeadHistoryEntry {
  id: string;
  /** Descripción del evento (cambio de estado, nota, importación…). */
  event: string;
  from_state?: LeadState;
  to_state?: LeadState;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  state: LeadState;
  /** Etiqueta libre (programa de interés, campaña…). */
  interest?: string;
  /** Objeción de venta (repesca). */
  objection?: LeadObjection;
  /** Fecha de ingreso del lead — ordena tarjetas y listado (fallback: created_at). */
  intake_date: string;
  /** El lead ya se convirtió en cliente (Fase 9). */
  is_customer: boolean;
  /** Usuario creado al convertir → enlaza a /dashboard/alumnos/:id. */
  converted_user_id?: string;
  /**
   * Persona asignada (setter/closer). El backend tiene UN solo `assigned_to`
   * (uuid) con su nombre en `assigned_to_name`; el filtro «Asignado» opera
   * sobre este valor. Los datos de ejemplo aún distinguen setter/closer.
   */
  assigned?: string;
  /** Setter asignado — solo datos de ejemplo (backend colapsa en `assigned`). */
  setter?: string;
  /** Closer asignado — solo datos de ejemplo (backend colapsa en `assigned`). */
  closer?: string;
  /** Valor estimado de la oportunidad en € (Bloque 1.1; suma por columna). */
  opportunity_value?: number;
  /** Motivo de pérdida (Bloque 1.3; se pide al mover a «Perdido»). */
  lost_reason?: LeadLostReason;
  /** Etiquetas libres (Bloque 1.4; caliente, VIP…). Siempre array. */
  tags: string[];
  notes: LeadNote[];
  history: LeadHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export interface LeadsQuery {
  search?: string;
  source?: LeadSource | "all";
  state?: LeadState | "all";
  /** Fuerza los datos de ejemplo aunque la API esté activa (`?demo=1`). */
  demo?: boolean;
}

export interface CreateLeadInput {
  name: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  state?: LeadState;
  interest?: string;
  objection?: LeadObjection;
  setter?: string;
  closer?: string;
}

export interface UpdateLeadInput {
  state?: LeadState;
  /** `null` limpia la objeción. */
  objection?: LeadObjection | null;
  /** Valor de la oportunidad en €; `null` lo limpia (Bloque 1.1). */
  opportunity_value?: number | null;
  /** Motivo de pérdida; `null` lo limpia (Bloque 1.3). */
  lost_reason?: LeadLostReason | null;
  /** Etiquetas: sustituyen a las existentes (Bloque 1.4). */
  tags?: string[];
}

/**
 * Resultado de convertir un lead. El backend responde
 * `{ lead, linked, converted_user_id, warning? }`: `linked=false` (y su
 * `warning`) cuando no encontró un usuario con el email/teléfono del lead —
 * queda «ganado» pero sin enlazar.
 */
export interface ConvertLeadResult {
  lead: Lead;
  linked: boolean;
  warning?: string;
}

// ─── Normalización estado/objeción (tolerante a v1, v2 y CSVs) ───────────────

const STATE_ALIASES: Record<string, LeadState> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  agendado: "Agendado",
  // «Asistió» (v1) ≡ «Llamada hecha» (v2 `realizada`)
  asistio: "Llamada hecha",
  asistió: "Llamada hecha",
  realizada: "Llamada hecha",
  "llamada hecha": "Llamada hecha",
  llamada_hecha: "Llamada hecha",
  "esperando pago": "Esperando pago",
  esperando_pago: "Esperando pago",
  ganado: "Ganado",
  perdido: "Perdido",
  seguimiento: "Seguimiento",
};

/** Estado desde la API o un CSV (v1 «Asistió», v2 `realizada`, etc.). */
export function normalizeLeadState(value: unknown): LeadState | undefined {
  if (typeof value !== "string") return undefined;
  return STATE_ALIASES[value.trim().toLowerCase()];
}

const OBJECTION_ALIASES: Record<string, LeadObjection> = {
  precio: "precio",
  price: "precio",
  caro: "precio",
  timing: "timing",
  pospone: "timing",
  "timing/pospone": "timing",
  "timing / pospone": "timing",
  tiempo: "timing",
  confianza: "confianza",
  trust: "confianza",
  presupuesto: "presupuesto",
  budget: "presupuesto",
  dinero: "presupuesto",
  otros: "otros",
  otro: "otros",
  other: "otros",
};

export function normalizeLeadObjection(value: unknown): LeadObjection | undefined {
  if (typeof value !== "string") return undefined;
  return OBJECTION_ALIASES[value.trim().toLowerCase()];
}

/** Motivo de pérdida desde la API (enum backend, tolerante a variantes). */
function normalizeLostReason(value: unknown): LeadLostReason | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().toLowerCase().replace(/\s+/g, "_");
  return (LEAD_LOST_REASONS as readonly string[]).includes(v) ? (v as LeadLostReason) : undefined;
}

const SOURCE_ALIASES: Record<string, LeadSource> = {
  web: "web",
  website: "web",
  formulario: "web",
  ig: "ig",
  instagram: "ig",
  insta: "ig",
  email: "email",
  correo: "email",
  mail: "email",
  youtube: "youtube",
  yt: "youtube",
  sorteo: "sorteo",
  otro: "otro",
  otros: "otro",
  other: "otro",
};

// ─── Detección runtime de los campos v2 (Fase 9) ─────────────────────────────

let leadsV2Detected = false;

/** ¿El GET de leads ya devuelve los campos del contrato de Fase 9? */
export function leadsApiHasV2Fields(): boolean {
  return leadsV2Detected;
}

/** ¿Podemos escribir estados/objeción v2 contra la API real? */
export function leadsV2WritesEnabled(): boolean {
  return LEADS_V2_WRITE_READY || leadsV2Detected;
}

function detectV2Fields(raw: unknown): void {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if ("objection" in o || "intake_date" in o || "is_customer" in o || "converted_user_id" in o) {
      leadsV2Detected = true;
    }
    // Pipeline v3 (Bloque 1 CRM-GHL): si el backend ya devuelve los campos
    // nuevos, se puede escribirlos aunque el flag manual siga apagado.
    if ("opportunity_value" in o || "lost_reason" in o || "tags" in o) {
      leadsV3Detected = true;
    }
  }
}

let leadsV3Detected = false;

/** ¿Podemos leer/escribir valor, motivo de pérdida y etiquetas (Bloque 1)? */
export function leadsPipelineV3Enabled(): boolean {
  return LEAD_PIPELINE_V3_READY || leadsV3Detected;
}

/**
 * El backend guarda las notas en UNA columna de texto (`notes`), no en una
 * colección. Cada nota se persiste como una línea `[ISO] cuerpo`; aquí se
 * parsea de vuelta a la lista que espera la UI (más recientes primero).
 */
function parseNotes(value: unknown, fallbackDate: string): LeadNote[] {
  if (Array.isArray(value)) return value as LeadNote[]; // datos de ejemplo
  if (typeof value === "string" && value.trim()) {
    return value
      .split("\n")
      .filter((l) => l.trim())
      .map((line, i) => {
        const m = line.match(/^\[(.+?)\]\s?([\s\S]*)$/);
        return m
          ? { id: `db-${i}`, body: m[2], author: "Staff", created_at: m[1] }
          : { id: `db-${i}`, body: line, author: "Staff", created_at: fallbackDate };
      })
      .reverse();
  }
  return [];
}

/** Tolerante a alias de campo entre v1 y v2. */
function normalizeLead(raw: any): Lead {
  const created = raw.created_at ?? raw.createdAt ?? nowIso();
  // Backend v2 usa `origin`; los datos de ejemplo y CSVs, `source`.
  const rawSource = String(raw.origin ?? raw.source ?? "").toLowerCase();
  const assigned = raw.assigned_to_name ?? raw.assigned ?? undefined;
  return {
    id: String(raw.id),
    name: raw.name ?? "(sin nombre)",
    email: raw.email ?? undefined,
    phone: raw.phone ?? undefined,
    source: SOURCE_ALIASES[rawSource] ?? "web",
    state: normalizeLeadState(raw.state ?? raw.status) ?? "Nuevo",
    interest: raw.interest ?? undefined,
    objection: normalizeLeadObjection(raw.objection),
    intake_date: raw.intake_date ?? raw.intakeDate ?? created,
    is_customer: Boolean(raw.is_customer ?? raw.isCustomer ?? raw.converted_user_id),
    converted_user_id: raw.converted_user_id ?? raw.convertedUserId ?? undefined,
    assigned: assigned || undefined,
    setter: raw.setter ?? raw.setter_name ?? undefined,
    closer: raw.closer ?? raw.closer_name ?? undefined,
    // Pipeline v3 (Bloque 1): tolerante a backends que aún no los devuelven.
    opportunity_value:
      raw?.opportunity_value != null && !Number.isNaN(Number(raw.opportunity_value))
        ? Number(raw.opportunity_value)
        : undefined,
    lost_reason: normalizeLostReason(raw?.lost_reason),
    tags: Array.isArray(raw?.tags) ? raw.tags.filter((t: unknown): t is string => typeof t === "string") : [],
    notes: parseNotes(raw.notes, raw.updated_at ?? raw.updatedAt ?? created),
    history: Array.isArray(raw.history) ? raw.history : [],
    created_at: created,
    updated_at: raw.updated_at ?? raw.updatedAt ?? created,
  };
}

/**
 * Estado UI → `status` del backend (enum LOWERCASE del QueryLeadsDTO). El
 * backend valida con forbidNonWhitelisted, así que hay que enviar exactamente
 * `nuevo|contactado|agendado|realizada|esperando_pago|ganado|perdido|seguimiento`.
 */
const STATE_TO_API: Record<LeadState, string> = {
  Nuevo: "nuevo",
  Contactado: "contactado",
  Agendado: "agendado",
  "Llamada hecha": "realizada",
  "Esperando pago": "esperando_pago",
  Ganado: "ganado",
  Perdido: "perdido",
  Seguimiento: "seguimiento",
};

function stateToApi(state: LeadState): string {
  if (leadsV2WritesEnabled()) return STATE_TO_API[state];
  // Contrato legado (v1): «Llamada hecha» ≡ «Asistió»; el resto de estados v2
  // (esperando_pago/seguimiento) no se pueden persistir.
  if (state === "Llamada hecha") return "Asistió";
  if (state === "Esperando pago" || state === "Seguimiento") {
    throw new Error(`El estado «${state}» se activará cuando el backend (Fase 9) publique el nuevo contrato de leads.`);
  }
  return STATE_TO_API[state];
}

/** Origen UI → `origin` del backend (enum web|instagram|email|youtube|otro). */
const SOURCE_TO_API: Record<LeadSource, string> = {
  web: "web",
  ig: "instagram",
  email: "email",
  youtube: "youtube",
  sorteo: "sorteo",
  otro: "otro",
};

// ─── Datos de ejemplo (con `!LEADS_API_READY` o `?demo=1`) ───────────────────
// Cubren los DOS kanbans: los 7 estados del pipeline + «Seguimiento», las 4
// objeciones, leads >30 días para el filtro de repesca, un convertido en
// cliente y setters/closers para los filtros.
const SAMPLE_LEADS: Lead[] = [
  {
    id: "sample-1",
    name: "Lucía Fernández",
    email: "lucia.fer@example.com",
    phone: "+34 600 111 222",
    source: "ig",
    state: "Nuevo",
    interest: "Programa Transfórmate",
    intake_date: "2026-07-19T10:30:00Z",
    is_customer: false,
    opportunity_value: 1200,
    tags: ["caliente"],
    setter: "María",
    notes: [],
    history: [{ id: "h1", event: "Lead creado desde Instagram (DM)", created_at: "2026-07-19T10:30:00Z" }],
    created_at: "2026-07-19T10:30:00Z",
    updated_at: "2026-07-19T10:30:00Z",
  },
  {
    id: "sample-2",
    name: "Carla Jiménez",
    email: "carlajim@example.com",
    source: "web",
    state: "Nuevo",
    interest: "Curso La Mujer",
    intake_date: "2026-07-17T08:05:00Z",
    is_customer: false,
    opportunity_value: 300,
    tags: [],
    setter: "Laura",
    notes: [],
    history: [{ id: "h2", event: "Lead creado desde formulario web", created_at: "2026-07-17T08:05:00Z" }],
    created_at: "2026-07-17T08:05:00Z",
    updated_at: "2026-07-17T08:05:00Z",
  },
  {
    id: "sample-3",
    name: "Marcos Ruiz",
    email: "marcosruiz@example.com",
    phone: "+34 611 333 444",
    source: "web",
    state: "Contactado",
    interest: "Asesoría 1:1",
    intake_date: "2026-07-16T11:00:00Z",
    is_customer: false,
    opportunity_value: 600,
    tags: ["VIP"],
    setter: "María",
    notes: [
      { id: "n1", body: "Le envié el enlace de la llamada.", author: "Staff", created_at: "2026-07-17T16:40:00Z" },
    ],
    history: [
      { id: "h3", event: "Lead creado desde formulario web", created_at: "2026-07-16T11:00:00Z" },
      {
        id: "h4",
        event: "Cambio de estado",
        from_state: "Nuevo",
        to_state: "Contactado",
        created_at: "2026-07-17T16:41:00Z",
      },
    ],
    created_at: "2026-07-16T11:00:00Z",
    updated_at: "2026-07-17T16:41:00Z",
  },
  {
    id: "sample-4",
    name: "Anaïs Prieto",
    email: "anais.p@example.com",
    source: "ig",
    state: "Agendado",
    interest: "Curso La Mujer",
    intake_date: "2026-07-15T08:00:00Z",
    is_customer: false,
    opportunity_value: 300,
    tags: ["caliente"],
    setter: "Laura",
    closer: "Hamlet",
    notes: [],
    history: [{ id: "h5", event: "Llamada agendada para el 22/07", created_at: "2026-07-18T12:00:00Z" }],
    created_at: "2026-07-15T08:00:00Z",
    updated_at: "2026-07-18T12:00:00Z",
  },
  {
    id: "sample-5",
    name: "Diego Santos",
    phone: "+34 622 555 666",
    source: "web",
    state: "Llamada hecha",
    interest: "Programa Transfórmate",
    intake_date: "2026-07-10T10:00:00Z",
    is_customer: false,
    opportunity_value: 1900,
    tags: [],
    setter: "María",
    closer: "Hamlet",
    notes: [],
    history: [{ id: "h6", event: "Llamada de valoración realizada", created_at: "2026-07-14T18:00:00Z" }],
    created_at: "2026-07-10T10:00:00Z",
    updated_at: "2026-07-14T18:00:00Z",
  },
  {
    id: "sample-6",
    name: "Nerea Campos",
    email: "nerea.campos@example.com",
    phone: "+34 633 777 888",
    source: "ig",
    state: "Esperando pago",
    interest: "Programa Transfórmate",
    intake_date: "2026-07-08T09:30:00Z",
    is_customer: false,
    opportunity_value: 2400,
    tags: ["caliente", "VIP"],
    setter: "Laura",
    closer: "Hamlet",
    notes: [
      {
        id: "n2",
        body: "Enlace de pago enviado tras la llamada.",
        author: "Staff",
        created_at: "2026-07-16T13:00:00Z",
      },
    ],
    history: [{ id: "h7", event: "Esperando el pago del programa", created_at: "2026-07-16T13:00:00Z" }],
    created_at: "2026-07-08T09:30:00Z",
    updated_at: "2026-07-16T13:00:00Z",
  },
  {
    id: "sample-7",
    name: "Paula Gómez",
    email: "paulag@example.com",
    source: "web",
    state: "Ganado",
    interest: "Asesoría 1:1",
    intake_date: "2026-07-05T09:00:00Z",
    is_customer: true,
    opportunity_value: 900,
    tags: [],
    converted_user_id: "sample-user-paula",
    setter: "María",
    closer: "Hamlet",
    notes: [{ id: "n3", body: "Contrató el plan trimestral.", author: "Staff", created_at: "2026-07-12T10:20:00Z" }],
    history: [{ id: "h8", event: "Cliente ganado 🎉", created_at: "2026-07-12T10:20:00Z" }],
    created_at: "2026-07-05T09:00:00Z",
    updated_at: "2026-07-12T10:20:00Z",
  },
  {
    id: "sample-8",
    name: "Iván Torres",
    email: "ivan.torres@example.com",
    source: "ig",
    state: "Perdido",
    interest: "Curso La Mujer",
    objection: "precio",
    intake_date: "2026-07-02T13:00:00Z",
    is_customer: false,
    opportunity_value: 300,
    lost_reason: "precio",
    tags: ["objecion-precio"],
    setter: "Laura",
    closer: "Hamlet",
    notes: [
      { id: "n4", body: "No encaja el presupuesto ahora mismo.", author: "Staff", created_at: "2026-07-11T15:00:00Z" },
    ],
    history: [{ id: "h9", event: "Marcado como perdido (precio)", created_at: "2026-07-11T15:00:00Z" }],
    created_at: "2026-07-02T13:00:00Z",
    updated_at: "2026-07-11T15:00:00Z",
  },
  {
    id: "sample-9",
    name: "Sonia Vidal",
    email: "sonia.vidal@example.com",
    phone: "+34 644 222 333",
    source: "web",
    state: "Perdido",
    interest: "Programa Transfórmate",
    objection: "timing",
    intake_date: "2026-06-05T10:00:00Z",
    is_customer: false,
    opportunity_value: 1200,
    lost_reason: "timing",
    tags: [],
    setter: "María",
    notes: [
      { id: "n5", body: "Quiere empezar después del verano.", author: "Staff", created_at: "2026-06-12T09:00:00Z" },
    ],
    history: [{ id: "h10", event: "Pospone la decisión a septiembre", created_at: "2026-06-12T09:00:00Z" }],
    created_at: "2026-06-05T10:00:00Z",
    updated_at: "2026-06-12T09:00:00Z",
  },
  {
    id: "sample-10",
    name: "Rubén Ortega",
    phone: "+34 655 444 555",
    source: "ig",
    state: "Perdido",
    interest: "Asesoría 1:1",
    objection: "confianza",
    intake_date: "2026-05-20T17:00:00Z",
    is_customer: false,
    opportunity_value: 600,
    lost_reason: "otro",
    tags: [],
    setter: "Laura",
    closer: "Hamlet",
    notes: [],
    history: [{ id: "h11", event: "Duda de los resultados; pide referencias", created_at: "2026-05-28T11:00:00Z" }],
    created_at: "2026-05-20T17:00:00Z",
    updated_at: "2026-05-28T11:00:00Z",
  },
  {
    id: "sample-11",
    name: "Elena Sanz",
    email: "elenasanz@example.com",
    source: "web",
    state: "Perdido",
    interest: "Curso La Mujer",
    intake_date: "2026-06-28T12:00:00Z",
    is_customer: false,
    lost_reason: "no_contesta",
    tags: [],
    setter: "María",
    notes: [],
    history: [{ id: "h12", event: "No respondió tras dos intentos", created_at: "2026-07-06T10:00:00Z" }],
    created_at: "2026-06-28T12:00:00Z",
    updated_at: "2026-07-06T10:00:00Z",
  },
  {
    id: "sample-12",
    name: "Javier Molina",
    email: "javimolina@example.com",
    phone: "+34 666 888 999",
    source: "ig",
    state: "Seguimiento",
    interest: "Programa Transfórmate",
    objection: "precio",
    intake_date: "2026-06-10T09:00:00Z",
    is_customer: false,
    opportunity_value: 1900,
    tags: ["caliente"],
    setter: "Laura",
    closer: "Hamlet",
    notes: [
      {
        id: "n6",
        body: "Retomar cuando salga la promo de agosto.",
        author: "Staff",
        created_at: "2026-06-20T16:00:00Z",
      },
    ],
    history: [{ id: "h13", event: "Pasa a seguimiento (campaña agosto)", created_at: "2026-06-20T16:00:00Z" }],
    created_at: "2026-06-10T09:00:00Z",
    updated_at: "2026-06-20T16:00:00Z",
  },
  {
    id: "sample-13",
    name: "Marta Iglesias",
    email: "marta.igl@example.com",
    source: "web",
    state: "Seguimiento",
    interest: "Asesoría 1:1",
    objection: "otros",
    intake_date: "2026-07-01T15:00:00Z",
    is_customer: false,
    opportunity_value: 600,
    tags: [],
    setter: "María",
    notes: [],
    history: [{ id: "h14", event: "Pendiente de decidir con su pareja", created_at: "2026-07-09T18:00:00Z" }],
    created_at: "2026-07-01T15:00:00Z",
    updated_at: "2026-07-09T18:00:00Z",
  },
];

// Copia mutable en memoria para que mover tarjetas / editar funcione en demo.
let sampleStore: Lead[] | null = null;
function getSampleStore(): Lead[] {
  sampleStore ??= SAMPLE_LEADS.map((l) => ({ ...l, notes: [...l.notes], history: [...l.history], tags: [...l.tags] }));
  return sampleStore;
}

/** Los ids del store de ejemplo llevan este prefijo; sus mutaciones son locales. */
function isSampleId(id: string): boolean {
  return id.startsWith("sample-");
}

const nowIso = () => new Date().toISOString();

function applyFilters(leads: Lead[], query?: LeadsQuery): Lead[] {
  let out = leads;
  if (query?.source && query.source !== "all") out = out.filter((l) => l.source === query.source);
  if (query?.state && query.state !== "all") out = out.filter((l) => l.state === query.state);
  if (query?.search?.trim()) {
    const q = query.search.trim().toLowerCase();
    out = out.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        l.interest?.toLowerCase().includes(q),
    );
  }
  return out;
}

export class LeadsService {
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

  static async getLeads(query?: LeadsQuery): Promise<Lead[]> {
    if (!LEADS_API_READY || query?.demo) {
      // Copias frescas: el store es mutable y, si devolviéramos las mismas
      // referencias, react-query/useMemo no verían los cambios tras mutar.
      return applyFilters(getSampleStore(), query).map((l) => ({
        ...l,
        notes: [...l.notes],
        history: [...l.history],
        tags: [...l.tags],
      }));
    }
    // El backend valida con forbidNonWhitelisted: SOLO acepta los params del
    // QueryLeadsDTO (status, origin, assigned_to, objection, intake_from/to,
    // search, page, limit). Enviar `source`/`state` (nombres de la UI) daría
    // 400. Como los kanbans agrupan por estado en cliente, paginamos en
    // servidor (limit máx. 200) acumulando páginas hasta agotar la lista, y
    // filtramos origen/estado localmente (Fase 17.3: antes se cortaba en 200).
    const PAGE_LIMIT = 200; // máximo que acepta el backend por página
    const MAX_PAGES = 25; // tope de seguridad: 5.000 leads
    const raw: any[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const params = new URLSearchParams();
      if (query?.search) params.set("search", query.search);
      params.set("limit", String(PAGE_LIMIT));
      params.set("page", String(page));
      const data = await this.request<any>(`/api/v1/admin-panel/leads?${params.toString()}`, {
        headers: this.authHeaders(),
      });
      const chunk: any[] = Array.isArray(data) ? data : (data.data ?? data.leads ?? []);
      // Guarda anti-bucle: si el backend ignorase `page` y repitiera la misma
      // página, cortamos en cuanto no aparezca ningún id nuevo.
      const seen = new Set(raw.map((l) => l.id));
      const fresh = chunk.filter((l) => !seen.has(l.id));
      raw.push(...fresh);
      if (chunk.length < PAGE_LIMIT || fresh.length === 0) break; // última página
      if (page === MAX_PAGES) {
        console.warn(`Leads: alcanzado el tope de ${MAX_PAGES * PAGE_LIMIT}; hay más leads sin cargar.`);
      }
    }
    raw.forEach(detectV2Fields);
    // Refiltra en cliente por si el backend ignora algún parámetro.
    return applyFilters(raw.map(normalizeLead), query);
  }

  static async createLead(input: CreateLeadInput, opts?: { demo?: boolean }): Promise<Lead> {
    if (!LEADS_API_READY || opts?.demo) {
      const now = nowIso();
      const lead: Lead = {
        id: `sample-${Date.now()}`,
        name: input.name,
        email: input.email,
        phone: input.phone,
        source: input.source,
        state: input.state ?? "Nuevo",
        interest: input.interest,
        objection: input.objection,
        intake_date: now,
        is_customer: false,
        setter: input.setter,
        closer: input.closer,
        tags: [],
        notes: [],
        history: [{ id: `h-${Date.now()}`, event: "Lead creado", created_at: now }],
        created_at: now,
        updated_at: now,
      };
      getSampleStore().unshift(lead);
      return lead;
    }
    // El DTO valida con forbidNonWhitelisted: solo campos del CreateLeadDTO
    // (name, email, phone, instagram, origin, status, notes, objection, …).
    // `interest` no es columna → se guarda como nota; `source`→`origin`,
    // `state`→`status` (ambos con el nombre y el enum que el backend espera).
    const body: Record<string, unknown> = {
      name: input.name,
      ...(input.email ? { email: input.email } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
      origin: SOURCE_TO_API[input.source],
      ...(input.interest ? { notes: `Interés: ${input.interest}` } : {}),
      ...(input.state ? { status: stateToApi(input.state) } : {}),
      ...(leadsV2WritesEnabled() && input.objection ? { objection: input.objection } : {}),
    };
    const raw = await this.request<any>(`/api/v1/admin-panel/leads`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    detectV2Fields(raw);
    return normalizeLead(raw);
  }

  /** Actualiza estado y/o objeción del lead. */
  static async updateLead(id: string, patch: UpdateLeadInput): Promise<Lead> {
    if (!LEADS_API_READY || isSampleId(id)) {
      const lead = getSampleStore().find((l) => l.id === id);
      if (!lead) throw new Error("Lead no encontrado");
      if (patch.state && patch.state !== lead.state) {
        lead.history.push({
          id: `h-${Date.now()}`,
          event: "Cambio de estado",
          from_state: lead.state,
          to_state: patch.state,
          created_at: nowIso(),
        });
        lead.state = patch.state;
      }
      if (patch.objection !== undefined) {
        const next = patch.objection ?? undefined;
        if (next !== lead.objection) {
          lead.history.push({
            id: `h-${Date.now()}-o`,
            event: next ? `Objeción: ${LEAD_OBJECTION_LABEL[next]}` : "Objeción retirada",
            created_at: nowIso(),
          });
          lead.objection = next;
        }
      }
      if (patch.opportunity_value !== undefined) {
        lead.opportunity_value = patch.opportunity_value ?? undefined;
      }
      if (patch.tags !== undefined) {
        lead.tags = [...patch.tags];
      }
      if (patch.lost_reason !== undefined) {
        const next = patch.lost_reason ?? undefined;
        if (next !== lead.lost_reason) {
          lead.history.push({
            id: `h-${Date.now()}-lr`,
            event: next ? `Motivo de pérdida: ${LEAD_LOST_REASON_LABEL[next]}` : "Motivo de pérdida retirado",
            created_at: nowIso(),
          });
          lead.lost_reason = next;
        }
      }
      lead.updated_at = nowIso();
      return { ...lead, tags: [...lead.tags] };
    }

    if (patch.objection !== undefined && !leadsV2WritesEnabled()) {
      throw new Error("La objeción se guardará cuando el backend (Fase 9) publique el nuevo contrato de leads.");
    }
    // Campos del pipeline v3 (valor €, motivo de pérdida, etiquetas): el
    // backend actual valida con forbidNonWhitelisted, así que solo se envían
    // cuando el contrato nuevo está activo (flag o autodetección). Si SOLO se
    // pedían campos v3, avisar en vez de fingir que se guardó.
    const v3 = leadsPipelineV3Enabled();
    const wantsV3 =
      patch.opportunity_value !== undefined || patch.lost_reason !== undefined || patch.tags !== undefined;
    if (wantsV3 && !v3 && patch.state === undefined && patch.objection === undefined) {
      throw new Error(
        "El valor, las etiquetas y el motivo de pérdida se guardarán cuando el backend (rama feature/crm-pipeline-completo) esté desplegado.",
      );
    }
    // Backend: `status` (no `state`); `objection: null` limpia la objeción.
    const body: Record<string, unknown> = {
      ...(patch.state ? { status: stateToApi(patch.state) } : {}),
      ...(patch.objection !== undefined ? { objection: patch.objection } : {}),
      ...(v3 && patch.opportunity_value !== undefined ? { opportunity_value: patch.opportunity_value } : {}),
      ...(v3 && patch.lost_reason !== undefined ? { lost_reason: patch.lost_reason } : {}),
      ...(v3 && patch.tags !== undefined ? { tags: patch.tags } : {}),
    };
    const raw = await this.request<any>(`/api/v1/admin-panel/leads/${id}`, {
      method: "PUT",
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    detectV2Fields(raw);
    return normalizeLead(raw);
  }

  /** Compatibilidad: cambio de estado (kanban / panel). */
  static async updateLeadState(id: string, state: LeadState): Promise<Lead> {
    return this.updateLead(id, { state });
  }

  /**
   * Convierte el lead en cliente (crea/enlaza el usuario en backend).
   * `POST /admin-panel/leads/:id/convert` → `{ lead, linked, converted_user_id,
   * warning? }`. Devuelve el aviso cuando el lead queda ganado SIN enlazar.
   */
  static async convertLead(id: string): Promise<ConvertLeadResult> {
    if (!LEADS_API_READY || isSampleId(id)) {
      const lead = getSampleStore().find((l) => l.id === id);
      if (!lead) throw new Error("Lead no encontrado");
      lead.is_customer = true;
      lead.converted_user_id ??= `sample-user-${id}`;
      lead.state = "Ganado";
      lead.history.push({ id: `h-${Date.now()}`, event: "Convertido en cliente ✅", created_at: nowIso() });
      lead.updated_at = nowIso();
      return { lead: { ...lead }, linked: true };
    }
    if (!LEAD_CONVERT_READY) {
      throw new Error("«Convertir en cliente» se activará cuando el backend (Fase 9) publique el endpoint.");
    }
    const raw = await this.request<any>(`/api/v1/admin-panel/leads/${id}/convert`, {
      method: "POST",
      headers: this.authHeaders(),
    });
    // El backend envuelve la respuesta: { lead, linked, converted_user_id, warning? }.
    const leadRaw = raw?.lead ?? raw;
    detectV2Fields(leadRaw);
    const lead = normalizeLead(leadRaw);
    // Si el backend no incluyó converted_user_id en la fila (envuelto aparte).
    if (!lead.converted_user_id && raw?.converted_user_id) {
      lead.converted_user_id = raw.converted_user_id;
      lead.is_customer = true;
    }
    return {
      lead,
      linked: Boolean(raw?.linked ?? lead.converted_user_id),
      warning: raw?.warning ?? undefined,
    };
  }

  static async addNote(id: string, body: string): Promise<LeadNote> {
    if (!LEADS_API_READY || isSampleId(id)) {
      const lead = getSampleStore().find((l) => l.id === id);
      if (!lead) throw new Error("Lead no encontrado");
      const note: LeadNote = { id: `n-${Date.now()}`, body, author: "Tú", created_at: nowIso() };
      lead.notes.unshift(note);
      lead.history.push({ id: `h-${Date.now()}`, event: "Nota añadida", created_at: nowIso() });
      lead.updated_at = nowIso();
      return note;
    }

    // Auditoría julio (low-sev "carrera en notas de lead"): dos personas
    // anotando el mismo lead a la vez perdían una nota, porque el único
    // camino era leer `notes`, concatenar aquí y reescribir el campo entero
    // — sin bloqueo, el segundo PUT pisaba al primero. El backend nuevo
    // concatena en una sola sentencia SQL (`POST leads/:id/notes`), así que
    // se prueba primero y solo se cae al camino viejo si el endpoint aún no
    // está desplegado (404 de ruta inexistente, no un error real).
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin-panel/leads/${id}/notes`, {
        method: "POST",
        headers: this.authHeaders(),
        body: JSON.stringify({ body }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });
      if (res.status === 401) {
        handleUnauthorized();
        throw new Error("Sesión caducada");
      }
      if (res.status !== 404) {
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.message ?? errBody.error ?? `Error ${res.status}`);
        }
        return { id: `n-${Date.now()}`, body, author: "Staff", created_at: nowIso() };
      }
      // 404 → sigue el fallback de abajo (ruta todavía no desplegada).
    } catch (err) {
      if (err instanceof Error && err.message !== "Failed to fetch" && !/NetworkError|fetch/i.test(err.message)) {
        throw err; // error real del endpoint nuevo (401, 400…): no lo ocultes con el fallback
      }
      // Red caída o endpoint no desplegable: cae al camino viejo igualmente.
    }

    // Fallback (backend sin el endpoint dedicado todavía): mismo riesgo de
    // carrera que antes, documentado arriba — se retira solo en cuanto el
    // 404 de arriba deje de darse.
    const current = await this.request<any>(`/api/v1/admin-panel/leads/${id}`, {
      headers: this.authHeaders(),
    });
    const existing = typeof current?.notes === "string" ? current.notes : "";
    const created = nowIso();
    const line = `[${created}] ${body}`;
    await this.request<any>(`/api/v1/admin-panel/leads/${id}`, {
      method: "PUT",
      headers: this.authHeaders(),
      body: JSON.stringify({ notes: existing ? `${existing}\n${line}` : line }),
    });
    return { id: `n-${Date.now()}`, body, author: "Staff", created_at: created };
  }

  /**
   * Importa leads desde un CSV. Cabeceras aceptadas (flexible):
   * name/nombre, email/correo, phone/telefono, source/origen, state/estado,
   * interest/interes, objection/objecion, setter, closer.
   * Con el backend apagado (o en demo), parsea en cliente y alimenta el store.
   */
  static async importCsv(file: File, opts?: { demo?: boolean }): Promise<{ imported: number; errors: string[] }> {
    if (!LEADS_API_READY || opts?.demo) {
      const text = await file.text();
      const { rows, errors } = parseLeadsCsv(text);
      for (const r of rows) {
        await this.createLead(r, { demo: true });
      }
      return { imported: rows.length, errors };
    }
    const form = new FormData();
    form.append("file", file);
    return this.request<{ imported: number; errors: string[] }>(`/api/v1/admin-panel/leads/import`, {
      method: "POST",
      headers: this.authHeaders(false),
      body: form,
    });
  }
}

// ─── Export CSV (repesca → campañas de recuperación) ─────────────────────────

function csvCell(value: string | undefined): string {
  const v = value ?? "";
  return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Genera un CSV (con BOM para Excel) con los leads seleccionados. */
export function leadsToCsv(leads: Lead[]): string {
  const header = ["nombre", "email", "telefono", "origen", "interes", "estado", "objecion", "alta", "setter", "closer"];
  const rows = leads.map((l) =>
    [
      l.name,
      l.email,
      l.phone,
      LEAD_SOURCE_LABEL[l.source],
      l.interest,
      l.state,
      l.objection ? LEAD_OBJECTION_LABEL[l.objection] : "",
      new Date(l.intake_date).toLocaleDateString("es-ES"),
      l.setter,
      l.closer,
    ]
      .map(csvCell)
      .join(","),
  );
  return `\uFEFF${header.join(",")}\n${rows.join("\n")}`;
}

// ─── Parser CSV mínimo (sin dependencias) ────────────────────────────────────

/** Divide una línea CSV respetando comillas dobles. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

export function parseLeadsCsv(text: string): { rows: CreateLeadInput[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { rows: [], errors: ["El archivo está vacío."] };

  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (names: string[]) => headers.findIndex((h) => names.includes(h));
  const iName = idx(["name", "nombre"]);
  const iEmail = idx(["email", "correo", "e-mail"]);
  const iPhone = idx(["phone", "telefono", "teléfono", "móvil", "movil"]);
  const iSource = idx(["source", "origen"]);
  const iState = idx(["state", "estado"]);
  const iInterest = idx(["interest", "interes", "interés", "programa"]);
  const iObjection = idx(["objection", "objecion", "objeción"]);
  const iSetter = idx(["setter"]);
  const iCloser = idx(["closer"]);

  if (iName === -1) {
    return { rows: [], errors: ["Falta la columna obligatoria «name» (o «nombre»)."] };
  }

  const rows: CreateLeadInput[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cols = splitCsvLine(lines[r]);
    const name = cols[iName]?.trim();
    if (!name) {
      errors.push(`Fila ${r + 1}: sin nombre, omitida.`);
      continue;
    }
    const sourceRaw = (iSource >= 0 ? cols[iSource] : "").trim().toLowerCase();
    const source = SOURCE_ALIASES[sourceRaw] ?? "web";
    rows.push({
      name,
      email: iEmail >= 0 ? cols[iEmail]?.trim() || undefined : undefined,
      phone: iPhone >= 0 ? cols[iPhone]?.trim() || undefined : undefined,
      source,
      state: iState >= 0 ? normalizeLeadState(cols[iState]) : undefined,
      interest: iInterest >= 0 ? cols[iInterest]?.trim() || undefined : undefined,
      objection: iObjection >= 0 ? normalizeLeadObjection(cols[iObjection]) : undefined,
      setter: iSetter >= 0 ? cols[iSetter]?.trim() || undefined : undefined,
      closer: iCloser >= 0 ? cols[iCloser]?.trim() || undefined : undefined,
    });
  }
  return { rows, errors };
}
