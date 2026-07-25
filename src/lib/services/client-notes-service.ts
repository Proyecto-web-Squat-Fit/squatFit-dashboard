import { getAuthToken } from "@/lib/auth/auth-utils";

// ============================================================================
// NOTAS DE STAFF sobre un cliente (Ficha técnica, Fase 17)
// ----------------------------------------------------------------------------
// El backend NO expone aún endpoints de notas por usuario (los de leads sí
// existen: POST /admin-panel/leads/:id/notes). Contrato propuesto (espejo del
// de leads, ver INFORME-FASE-17):
//   GET    /api/v1/admin-panel/users/:id/notes            → StaffNote[]
//   POST   /api/v1/admin-panel/users/:id/notes  {body}    → StaffNote
//   DELETE /api/v1/admin-panel/users/notes/:noteId        → 200
// Mientras tanto, CLIENT_NOTES_API_READY = false: notas en memoria de la
// sesión (no persisten) con aviso en la UI.
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://squatfit-api-cyrc2g3zra-no.a.run.app";
const REQUEST_TIMEOUT = 12000;

// Encender cuando el backend exponga admin-panel/users/:id/notes.
export const CLIENT_NOTES_API_READY = true;

export interface StaffNote {
  id: string;
  body: string;
  /** Rol de quien escribió la nota (el backend lo tomará del token). */
  author_role: string | null;
  created_at: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { ...headers, ...(options.headers ?? {}) },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message ?? `Error ${res.status}`);
    }
    return (await res.json().catch(() => ({}))) as T;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

// Notas demo por usuario, solo en memoria de la pestaña.
const demoNotes = new Map<string, StaffNote[]>();

export const ClientNotesService = {
  ready: CLIENT_NOTES_API_READY,

  async getNotes(userId: string): Promise<StaffNote[]> {
    if (!CLIENT_NOTES_API_READY) return [...(demoNotes.get(userId) ?? [])];
    return request<StaffNote[]>(`/api/v1/admin-panel/users/${userId}/notes`);
  },

  async addNote(userId: string, body: string, authorRole: string | null): Promise<StaffNote> {
    if (!CLIENT_NOTES_API_READY) {
      const note: StaffNote = {
        id: `demo-n-${Date.now()}`,
        body,
        author_role: authorRole,
        created_at: new Date().toISOString(),
      };
      demoNotes.set(userId, [note, ...(demoNotes.get(userId) ?? [])]);
      return note;
    }
    return request<StaffNote>(`/api/v1/admin-panel/users/${userId}/notes`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  },

  async deleteNote(userId: string, noteId: string): Promise<void> {
    if (!CLIENT_NOTES_API_READY) {
      demoNotes.set(
        userId,
        (demoNotes.get(userId) ?? []).filter((n) => n.id !== noteId),
      );
      return;
    }
    await request(`/api/v1/admin-panel/users/notes/${noteId}`, { method: "DELETE" });
  },
};
