import { handleUnauthorized } from "@/lib/api-client";
import { getAuthToken } from "@/lib/auth/auth-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

const REQUEST_TIMEOUT = 12000;

// ============================================================================
// CRM — TAREAS POR LEAD (Bloque 1.2 del plan CRM-GHL)
// ----------------------------------------------------------------------------
// Tareas con fecha por lead («llamar el martes», «enviar propuesta») con lista
// de «Mis tareas de hoy» encima del kanban. Backend en la rama
// `feature/crm-pipeline-completo` (SIN mergear/desplegar):
//   • GET    /api/v1/admin-panel/leads/tasks/today      ({ data, total, overdue })
//   • GET    /api/v1/admin-panel/leads/:id/tasks
//   • POST   /api/v1/admin-panel/leads/:id/tasks        ({ title, due_at, assignee_id? })
//   • PATCH  /api/v1/admin-panel/leads/:id/tasks/:taskId ({ title?, due_at?, assignee_id?, done? })
//   • DELETE /api/v1/admin-panel/leads/:id/tasks/:taskId
//
// «Hoy» = zona Europa/Madrid en el backend; `today` incluye también las
// VENCIDAS de días anteriores (con `overdue` para el contador rojo).
// ============================================================================

/**
 * Encender cuando el backend (rama feature/crm-pipeline-completo) esté
 * desplegado en prod. Mientras esté apagado, toda la UI de tareas funciona
 * con datos de ejemplo en memoria (patrón COURSE_CONTENT_API_READY).
 */
export const LEAD_TASKS_API_READY = true;

export interface LeadTask {
  id: string;
  lead_id: string;
  title: string;
  /** ISO. El backend guarda timestamptz. */
  due_at: string;
  done: boolean;
  done_at?: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  created_by?: string | null;
  created_at: string;
  // ── Solo en `today` (join con leads) ──
  lead_name?: string;
  lead_status?: string;
  lead_phone?: string | null;
  lead_email?: string | null;
  lead_instagram?: string | null;
}

export interface CreateLeadTaskInput {
  title: string;
  due_at: string;
  assignee_id?: string | null;
}

export interface UpdateLeadTaskInput {
  title?: string;
  due_at?: string;
  assignee_id?: string | null;
  done?: boolean;
}

export interface LeadTasksTodayResult {
  data: LeadTask[];
  total: number;
  /** Cuántas vienen vencidas de días ANTERIORES (para el aviso rojo). */
  overdue: number;
}

// ─── Datos de ejemplo (mientras !LEAD_TASKS_API_READY o en ?demo=1) ──────────
// Ligados a los leads de ejemplo de leads-service para que la ficha y el panel
// «Mis tareas de hoy» cuenten la misma historia en la revisión visual.

const now = () => new Date();
const iso = (d: Date) => d.toISOString();

function todayAt(hours: number, minutes = 0): string {
  const d = now();
  d.setHours(hours, minutes, 0, 0);
  return iso(d);
}

function daysFromTodayAt(days: number, hours: number, minutes = 0): string {
  const d = now();
  d.setDate(d.getDate() + days);
  d.setHours(hours, minutes, 0, 0);
  return iso(d);
}

const SAMPLE_TASKS: LeadTask[] = [
  {
    id: "task-1",
    lead_id: "sample-1",
    title: "Responder al DM y proponer llamada",
    due_at: todayAt(10, 0),
    done: false,
    assignee_name: "María",
    created_at: daysFromTodayAt(-1, 18, 0),
    lead_name: "Lucía Fernández",
    lead_status: "Nuevo",
    lead_phone: "+34 600 111 222",
  },
  {
    id: "task-2",
    lead_id: "sample-6",
    title: "Reenviar enlace de pago (lo pidió ayer)",
    due_at: todayAt(12, 30),
    done: false,
    assignee_name: "María",
    created_at: daysFromTodayAt(-1, 13, 0),
    lead_name: "Nerea Campos",
    lead_status: "Esperando pago",
    lead_phone: "+34 633 777 888",
  },
  {
    id: "task-3",
    lead_id: "sample-4",
    title: "Confirmar la llamada agendada",
    due_at: daysFromTodayAt(-1, 17, 0), // vencida (ayer)
    done: false,
    assignee_name: "María",
    created_at: daysFromTodayAt(-3, 9, 0),
    lead_name: "Anaïs Prieto",
    lead_status: "Agendado",
  },
  {
    id: "task-4",
    lead_id: "sample-12",
    title: "Retomar cuando salga la promo de agosto",
    due_at: daysFromTodayAt(-2, 11, 0), // vencida (hace 2 días)
    done: false,
    assignee_name: "Hamlet",
    created_at: daysFromTodayAt(-10, 16, 0),
    lead_name: "Javier Molina",
    lead_status: "Seguimiento",
    lead_phone: "+34 666 888 999",
  },
  {
    id: "task-5",
    lead_id: "sample-5",
    title: "Enviar propuesta del programa",
    due_at: todayAt(9, 0),
    done: true,
    done_at: todayAt(9, 15),
    assignee_name: "Hamlet",
    created_at: daysFromTodayAt(-1, 19, 0),
    lead_name: "Diego Santos",
    lead_status: "Llamada hecha",
  },
  {
    id: "task-6",
    lead_id: "sample-3",
    title: "Llamar el martes para resolver dudas",
    due_at: daysFromTodayAt(2, 10, 0), // futura: NO sale en «hoy»
    done: false,
    assignee_name: "María",
    created_at: todayAt(8, 0),
    lead_name: "Marcos Ruiz",
    lead_status: "Contactado",
  },
];

let sampleTasksStore: LeadTask[] | null = null;
function getSampleTasks(): LeadTask[] {
  sampleTasksStore ??= SAMPLE_TASKS.map((t) => ({ ...t }));
  return sampleTasksStore;
}

function isSampleLeadId(id: string): boolean {
  return id.startsWith("sample-");
}

/** Fin del día de hoy (LOCAL — el navegador del staff está en España). */
function endOfToday(): Date {
  const d = now();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfToday(): Date {
  const d = now();
  d.setHours(0, 0, 0, 0);
  return d;
}

export class LeadTasksService {
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

  /** «Mis tareas de hoy»: pendientes de hoy + vencidas, del staff autenticado. */
  static async getToday(opts?: { demo?: boolean }): Promise<LeadTasksTodayResult> {
    if (!LEAD_TASKS_API_READY || opts?.demo) {
      const limit = endOfToday().getTime();
      const start = startOfToday().getTime();
      const data = getSampleTasks()
        .filter((t) => !t.done && new Date(t.due_at).getTime() <= limit)
        .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
        .map((t) => ({ ...t }));
      const overdue = data.filter((t) => new Date(t.due_at).getTime() < start).length;
      return { data, total: data.length, overdue };
    }
    return this.request<LeadTasksTodayResult>(`/api/v1/admin-panel/leads/tasks/today`, {
      headers: this.authHeaders(),
    });
  }

  static async getByLead(leadId: string, opts?: { demo?: boolean }): Promise<LeadTask[]> {
    if (!LEAD_TASKS_API_READY || opts?.demo || isSampleLeadId(leadId)) {
      return getSampleTasks()
        .filter((t) => t.lead_id === leadId)
        .sort((a, b) => Number(a.done) - Number(b.done) || new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
        .map((t) => ({ ...t }));
    }
    return this.request<LeadTask[]>(`/api/v1/admin-panel/leads/${leadId}/tasks`, {
      headers: this.authHeaders(),
    });
  }

  static async create(leadId: string, input: CreateLeadTaskInput, opts?: { demo?: boolean }): Promise<LeadTask> {
    if (!LEAD_TASKS_API_READY || opts?.demo || isSampleLeadId(leadId)) {
      const task: LeadTask = {
        id: `task-${Date.now()}`,
        lead_id: leadId,
        title: input.title.trim(),
        due_at: input.due_at,
        done: false,
        assignee_id: input.assignee_id ?? null,
        assignee_name: "Tú",
        created_at: iso(now()),
      };
      getSampleTasks().unshift(task);
      return { ...task };
    }
    return this.request<LeadTask>(`/api/v1/admin-panel/leads/${leadId}/tasks`, {
      method: "POST",
      headers: this.authHeaders(),
      body: JSON.stringify(input),
    });
  }

  static async update(
    leadId: string,
    taskId: string,
    patch: UpdateLeadTaskInput,
    opts?: { demo?: boolean },
  ): Promise<LeadTask> {
    if (!LEAD_TASKS_API_READY || opts?.demo || isSampleLeadId(leadId)) {
      const task = getSampleTasks().find((t) => t.id === taskId && t.lead_id === leadId);
      if (!task) throw new Error("Tarea no encontrada");
      if (patch.title !== undefined) task.title = patch.title.trim();
      if (patch.due_at !== undefined) task.due_at = patch.due_at;
      if (patch.assignee_id !== undefined) task.assignee_id = patch.assignee_id;
      if (patch.done !== undefined) {
        task.done = patch.done;
        task.done_at = patch.done ? iso(now()) : null;
      }
      return { ...task };
    }
    return this.request<LeadTask>(`/api/v1/admin-panel/leads/${leadId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: this.authHeaders(),
      body: JSON.stringify(patch),
    });
  }

  static async remove(leadId: string, taskId: string, opts?: { demo?: boolean }): Promise<void> {
    if (!LEAD_TASKS_API_READY || opts?.demo || isSampleLeadId(leadId)) {
      const store = getSampleTasks();
      const idx = store.findIndex((t) => t.id === taskId && t.lead_id === leadId);
      if (idx === -1) throw new Error("Tarea no encontrada");
      store.splice(idx, 1);
      return;
    }
    await this.request<{ message: string }>(`/api/v1/admin-panel/leads/${leadId}/tasks/${taskId}`, {
      method: "DELETE",
      headers: this.authHeaders(),
    });
  }
}
