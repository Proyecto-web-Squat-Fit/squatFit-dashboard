import { getAuthToken } from "@/lib/auth/auth-utils";

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://squatfit-api-cyrc2g3zra-no.a.run.app";
const REQUEST_TIMEOUT = 10000;

// ============================================================================
// TIPOS
// ============================================================================

export interface PackVersion {
  version_id: string;
  version_title?: string;
  book_title?: string;
}

export interface PackApi {
  id: string;
  name: string;
  description?: string | null;
  price: string;
  is_active?: boolean;
  versions?: PackVersion[];
  created_at?: string;
  updated_at?: string;
}

export interface Pack {
  id: string;
  name: string;
  description: string;
  price: number;
  versions: PackVersion[];
  versionsCount?: number;
  /** false = pack desactivado (no vendible) */
  isActive: boolean;
}

export interface CreatePackDto {
  name: string;
  description?: string;
  price: string;
  version_ids: string[];
}

export interface UpdatePackDto {
  name?: string;
  description?: string;
  price?: string;
  is_active?: boolean;
}

// ============================================================================
// SERVICIO DE PACKS
// ============================================================================

export class PacksService {
  private static getDefaultHeaders(token: string | null): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (typeof window !== "undefined") {
      try {
        const t = localStorage.getItem("authToken");
        if (t) headers.Authorization = `Bearer ${t}`;
      } catch {
        // ignore
      }
    }
    return headers;
  }

  private static async handleError(response: Response): Promise<never> {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) throw new Error("Unauthorized");
    throw new Error(err.message ?? err.error ?? `Error ${response.status}`);
  }

  private static async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: { ...this.getDefaultHeaders(token), ...(options.headers as Record<string, string>) },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) await this.handleError(res);
      return res.json();
    } catch (e) {
      clearTimeout(timeoutId);
      if (e instanceof Error && e.name === "AbortError") throw new Error("La petición tardó demasiado");
      throw e;
    }
  }

  private static transformPack(api: PackApi): Pack {
    const versions = api.versions ?? [];
    return {
      id: api.id,
      name: api.name,
      description: api.description ?? "",
      price: parseFloat(api.price) || 0,
      versions,
      versionsCount: versions.length,
      isActive: api.is_active !== false,
    };
  }

  static async getPacks(): Promise<Pack[]> {
    const res = await this.makeRequest<PackApi[] | { data: PackApi[] }>("/api/v1/book/packs");
    const arr = Array.isArray(res) ? res : ((res as { data?: PackApi[] }).data ?? []);
    return arr.map((p) => this.transformPack(p));
  }

  static async getPackById(id: string): Promise<Pack> {
    const res = await this.makeRequest<PackApi | { data: PackApi }>(`/api/v1/book/packs/${id}`);
    const data = (res as { data?: PackApi }).data ?? (res as PackApi);
    return this.transformPack(data);
  }

  static async createPack(data: CreatePackDto): Promise<Pack> {
    if (!data.name || !data.price || !data.version_ids?.length) {
      throw new Error("Nombre, precio y al menos una versión son requeridos");
    }
    const res = await this.makeRequest<PackApi | { data: PackApi }>("/api/v1/book/packs", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        description: data.description || undefined,
        price: data.price,
        version_ids: data.version_ids,
      }),
    });
    const packData = (res as { data?: PackApi }).data ?? (res as PackApi);
    return this.transformPack(packData);
  }

  static async updatePack(id: string, data: UpdatePackDto): Promise<Pack> {
    const body: Record<string, string> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.description !== undefined) body.description = data.description;
    if (data.price !== undefined) body.price = data.price;
    const res = await this.makeRequest<PackApi | { data: PackApi }>(`/api/v1/book/packs/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    const packData = (res as { data?: PackApi }).data ?? (res as PackApi);
    return this.transformPack(packData);
  }

  static async deletePack(id: string): Promise<void> {
    await this.makeRequest(`/api/v1/book/packs/${id}`, { method: "DELETE" });
  }
}
