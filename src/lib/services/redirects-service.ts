import { getAuthToken } from "@/lib/auth/auth-utils";

// ============================================================================
// Servicio de REDIRECCIONES / Pretty Links del back office.
// ----------------------------------------------------------------------------
// El backend YA expone las redirecciones `/r/<slug>` (301 + contador de hits,
// tabla `redirects`) y el CRUD de administración en admin-panel/redirects/*
// (13.7). Este servicio SOLO habla con ese CRUD; el endpoint público que
// resuelve el slug vive en el backend y no lo toca el front.
//
// Contrato (ver src/squat-fit/redirects/dto/redirect.dto.ts del backend):
// - slug: string obligatorio, sin barras, se normaliza en minúsculas.
// - target_url: URL obligatoria (IsUrl con require_tld: false).
// - active: boolean opcional, default true.
// El backend rechaza slugs duplicados con 400 ("El slug "X" ya existe").
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://squatfit-api-cyrc2g3zra-no.a.run.app";
const REQUEST_TIMEOUT = 12000;

export interface Redirect {
  id: string;
  slug: string;
  target_url: string;
  hits: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RedirectsQuery {
  search?: string;
  /** "true" | "false"; sin definir = todos. */
  active?: "true" | "false";
  page?: number;
  limit?: number;
}

export interface RedirectsListResult {
  data: Redirect[];
  total: number;
}

export interface CreateRedirectInput {
  slug: string;
  target_url: string;
  active?: boolean;
}

export type UpdateRedirectInput = Partial<CreateRedirectInput>;

function qs<T extends object>(params: T): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params as Record<string, string | number | undefined>)) {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

async function request<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const message = (body as { message?: string | string[] }).message;
      throw new Error(
        (Array.isArray(message) ? message.join(", ") : message) ?? `Error ${res.status}: ${res.statusText}`,
      );
    }
    return (await res.json().catch(() => ({}))) as T;
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("La petición tardó demasiado tiempo");
    }
    throw e;
  }
}

export const RedirectsService = {
  async list(query: RedirectsQuery = {}): Promise<RedirectsListResult> {
    return request<RedirectsListResult>(`/api/v1/admin-panel/redirects${qs(query)}`);
  },

  async create(input: CreateRedirectInput): Promise<Redirect> {
    return request<Redirect>(`/api/v1/admin-panel/redirects`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async update(id: string, input: UpdateRedirectInput): Promise<Redirect> {
    return request<Redirect>(`/api/v1/admin-panel/redirects/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  async remove(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/v1/admin-panel/redirects/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
};
