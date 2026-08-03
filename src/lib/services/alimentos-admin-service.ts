import { getAuthToken } from "@/lib/auth/auth-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

// ============================================================================
// Servicio de la BASE DE DATOS ALIMENTARIA del back office (Nutri):
// Lista de Alimentos · Sustituciones.
// ----------------------------------------------------------------------------
// Backend: admin-panel/foods/* (33.647 alimentos + grupos de sustitución +
// productos recomendados + equivalencias EEUU + pares ES-USA + suplementos),
// sembrado por scripts/seed-alimentos.ts. Reestructura 27-jul: mismo patrón de
// flag que recetas-admin-service.ts (RECIPES_API_READY).
// ============================================================================

const REQUEST_TIMEOUT = 12000;

// Encender cuando admin-panel/foods/* esté desplegado en prod y sembrado.
export const FOODS_API_READY = true;

// ============================================================================
// Tipos
// ============================================================================
export interface FoodMacros100g {
  kcal: number | null;
  grasas: number | null;
  carbos: number | null;
  protes: number | null;
}

export interface AdminFood {
  id: string;
  fuente: string | null;
  nombre: string;
  nombre_original: string | null;
  marca: string | null;
  familia: string | null;
  categoria_id: string | null;
  categoria: string | null;
  subcategoria: string | null;
  supermercados: string[];
  dietas: string[];
  alergenos: string[];
  frecuencia: string | null;
  grupo_id: string | null;
  estado_base: string | null;
  uso_principal: string | null;
  usos_secundarios: string[];
  macros_100g: FoodMacros100g;
  nutri_extra: Record<string, unknown> | null;
  preparaciones: Record<string, unknown> | null;
  base_ingrediente: string | null;
  racion_sugerida: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminFoodDetail extends AdminFood {
  sustitutos: AdminFood[];
  grupo: {
    id: string;
    categoria: string | null;
    familia: string | null;
    kcal_min: number | null;
    kcal_max: number | null;
    kcal_objetivo: number | null;
    etiqueta: string | null;
    macros_representativos: Record<string, unknown> | null;
  } | null;
}

export interface FoodsMeta {
  familias: string[];
  categorias: { id: string; nombre: string }[];
  dietas: string[];
  alergenos: string[];
  supermercados: string[];
}

export interface FoodSubstitution {
  id: string;
  categoria: string | null;
  nombre: string;
  comprar_es: string | null;
  comprar_us: string | null;
}

export interface FoodUsEquivalence {
  id: string;
  ingrediente: string;
  veces: number | null;
  equivalente: string;
}

export interface FoodEsUsPair {
  id: string;
  categoria: string | null;
  es_nombre: string | null;
  es_comprar: string | null;
  us_nombre: string | null;
  us_comprar: string | null;
  kcal_ref: number | null;
  origen: string | null;
}

export interface FoodSupplement {
  id: string;
  objetivo: string | null;
  nombre: string;
  indicacion: string | null;
  pauta: string | null;
  cuando: string | null;
  composicion: string | null;
  precauciones: string | null;
  comprar_es: string | null;
  comprar_us: string | null;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface FoodsQuery {
  search?: string;
  familia?: string;
  categoria_id?: string;
  dieta?: string;
  sin_alergeno?: string;
  supermercado?: string;
  frecuencia?: string;
  page?: number;
  limit?: number;
}

export interface SimpleListQuery {
  search?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Cliente HTTP (mismo patrón que RecetasAdminService)
// ============================================================================
async function request<T>(endpoint: string): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers, signal: controller.signal });
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

function qs<T extends object>(params: T): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params as Record<string, string | number | undefined>)) {
    if (v !== undefined && v !== null && v !== "") usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

// ============================================================================
// API pública
// ============================================================================
export const AlimentosAdminService = {
  ready: FOODS_API_READY,

  async getFoods(query: FoodsQuery): Promise<Paginated<AdminFood>> {
    return request<Paginated<AdminFood>>(`/api/v1/admin-panel/foods${qs(query)}`);
  },

  async getFood(id: string): Promise<AdminFoodDetail> {
    return request<AdminFoodDetail>(`/api/v1/admin-panel/foods/${encodeURIComponent(id)}`);
  },

  async getMeta(): Promise<FoodsMeta> {
    return request<FoodsMeta>(`/api/v1/admin-panel/foods/meta`);
  },

  async getSubstitutions(query: SimpleListQuery): Promise<Paginated<FoodSubstitution>> {
    return request<Paginated<FoodSubstitution>>(`/api/v1/admin-panel/foods/substitutions${qs(query)}`);
  },

  async getUsEquivalences(query: SimpleListQuery): Promise<Paginated<FoodUsEquivalence>> {
    return request<Paginated<FoodUsEquivalence>>(`/api/v1/admin-panel/foods/us-equivalences${qs(query)}`);
  },

  async getEsUsPairs(query: SimpleListQuery): Promise<Paginated<FoodEsUsPair>> {
    return request<Paginated<FoodEsUsPair>>(`/api/v1/admin-panel/foods/es-us-pairs${qs(query)}`);
  },

  async getSupplements(query: SimpleListQuery): Promise<Paginated<FoodSupplement>> {
    return request<Paginated<FoodSupplement>>(`/api/v1/admin-panel/foods/supplements${qs(query)}`);
  },
};
