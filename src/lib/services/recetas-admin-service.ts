import { getAuthToken } from "@/lib/auth/auth-utils";

// ============================================================================
// Servicio del EDITOR DE RECETAS del back office (Fase 17)
// Duración · Ingredientes · Preparación · Materiales · Macros.
// ----------------------------------------------------------------------------
// El backend tiene tablas de recetas, pero los endpoints de administración
// (admin-panel/recipes/*) NO existen en prod: sondeado el 22-jul-2026 →
// GET /api/v1/admin-panel/recipes responde 404 (el /api/v1/recipe/* antiguo
// existe pero solo soporta nombre, descripción y macros, sin ingredientes ni
// preparación). Mientras no se despliegue, RECIPES_API_READY = false: la
// pantalla funciona con un banco demo en memoria y un aviso, igual que se hizo
// con el contenido de cursos. Al desplegar, poner el flag a true.
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://squatfit-api-cyrc2g3zra-no.a.run.app";
const REQUEST_TIMEOUT = 12000;

// Encender cuando el backend exponga admin-panel/recipes/* en prod.
export const RECIPES_API_READY = true;

// ============================================================================
// Tipos (contrato propuesto para el backend — ver INFORME-FASE-17)
// ============================================================================
export interface RecipeIngredient {
  /** Nombre del ingrediente, p. ej. «Pechuga de pollo». */
  name: string;
  /** Cantidad con unidad, texto libre: «200 g», «1 cda», «al gusto». */
  quantity: string;
}

export interface AdminRecipe {
  id: string;
  name: string;
  description: string | null;
  /** Duración total de preparación en minutos. */
  duration_minutes: number | null;
  /** Raciones que salen de la receta. */
  servings: number | null;
  ingredients: RecipeIngredient[];
  /** Pasos de preparación, en orden. */
  preparation_steps: string[];
  /** Materiales/utensilios necesarios: «sartén», «batidora»… */
  materials: string[];
  // Macros por ración
  kcal: number;
  carbohydrates: number;
  proteins: number;
  fats: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeInput {
  name: string;
  description?: string | null;
  duration_minutes?: number | null;
  servings?: number | null;
  ingredients: RecipeIngredient[];
  preparation_steps: string[];
  materials: string[];
  kcal: number;
  carbohydrates: number;
  proteins: number;
  fats: number;
}

// ============================================================================
// Cliente HTTP (mismo patrón que CursoContenidoService)
// ============================================================================
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

// ============================================================================
// Banco demo (solo mientras RECIPES_API_READY === false)
// Store mutable en memoria: crear/editar/borrar se ve reflejado en la sesión,
// pero NO persiste (se avisa en la pantalla).
// ============================================================================
let demoStore: AdminRecipe[] | null = null;

function demoRecipes(): AdminRecipe[] {
  const t = "2026-07-01T10:00:00.000Z";
  return [
    {
      id: "demo-r-1",
      name: "Tortitas de avena y claras",
      description: "Desayuno alto en proteína, listo en 10 minutos.",
      duration_minutes: 10,
      servings: 1,
      ingredients: [
        { name: "Copos de avena", quantity: "60 g" },
        { name: "Claras de huevo", quantity: "200 ml" },
        { name: "Plátano maduro", quantity: "1 ud" },
        { name: "Canela", quantity: "al gusto" },
      ],
      preparation_steps: [
        "Triturar la avena con las claras y el plátano hasta obtener una masa homogénea.",
        "Calentar la sartén a fuego medio con una gota de aceite.",
        "Verter porciones pequeñas y cocinar 2 min por cara hasta dorar.",
        "Servir con canela por encima.",
      ],
      materials: ["Batidora", "Sartén antiadherente", "Espátula"],
      kcal: 420,
      carbohydrates: 55,
      proteins: 30,
      fats: 8,
      image_url: null,
      created_at: t,
      updated_at: t,
    },
    {
      id: "demo-r-2",
      name: "Bowl de pollo, arroz y verduras",
      description: "Comida completa para después de entrenar.",
      duration_minutes: 25,
      servings: 2,
      ingredients: [
        { name: "Pechuga de pollo", quantity: "300 g" },
        { name: "Arroz basmati", quantity: "150 g en seco" },
        { name: "Brócoli", quantity: "200 g" },
        { name: "Aceite de oliva", quantity: "1 cda" },
        { name: "Salsa de soja", quantity: "2 cdas" },
      ],
      preparation_steps: [
        "Cocer el arroz según el paquete y reservar.",
        "Saltear el pollo en dados con el aceite hasta dorarlo.",
        "Añadir el brócoli en floretes y saltear 5 min más.",
        "Mezclar con el arroz y aliñar con la soja.",
      ],
      materials: ["Cazo", "Wok o sartén grande"],
      kcal: 520,
      carbohydrates: 62,
      proteins: 42,
      fats: 10,
      image_url: null,
      created_at: t,
      updated_at: t,
    },
    {
      id: "demo-r-3",
      name: "Yogur con frutos rojos y nueces",
      description: null,
      duration_minutes: 5,
      servings: 1,
      ingredients: [
        { name: "Yogur griego natural", quantity: "250 g" },
        { name: "Frutos rojos", quantity: "100 g" },
        { name: "Nueces", quantity: "20 g" },
        { name: "Miel", quantity: "1 cdta" },
      ],
      preparation_steps: ["Servir el yogur en un bol.", "Añadir los frutos rojos, las nueces y la miel por encima."],
      materials: ["Bol"],
      kcal: 350,
      carbohydrates: 28,
      proteins: 22,
      fats: 16,
      image_url: null,
      created_at: t,
      updated_at: t,
    },
  ];
}

function getDemoStore(): AdminRecipe[] {
  demoStore ??= demoRecipes();
  return demoStore;
}

function nowIso() {
  return new Date().toISOString();
}

// ============================================================================
// API pública
// ============================================================================
export const RecetasAdminService = {
  ready: RECIPES_API_READY,

  async getRecipes(): Promise<AdminRecipe[]> {
    if (!RECIPES_API_READY) {
      // Copias frescas para que react-query/useState detecten cambios tras mutar.
      return getDemoStore().map((r) => ({
        ...r,
        ingredients: [...r.ingredients],
        preparation_steps: [...r.preparation_steps],
        materials: [...r.materials],
      }));
    }
    return request<AdminRecipe[]>(`/api/v1/admin-panel/recipes`);
  },

  async createRecipe(input: RecipeInput): Promise<AdminRecipe> {
    if (!RECIPES_API_READY) {
      const recipe: AdminRecipe = {
        id: `demo-r-${Date.now()}`,
        name: input.name,
        description: input.description ?? null,
        duration_minutes: input.duration_minutes ?? null,
        servings: input.servings ?? null,
        ingredients: input.ingredients,
        preparation_steps: input.preparation_steps,
        materials: input.materials,
        kcal: input.kcal,
        carbohydrates: input.carbohydrates,
        proteins: input.proteins,
        fats: input.fats,
        image_url: null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      getDemoStore().unshift(recipe);
      return recipe;
    }
    return request<AdminRecipe>(`/api/v1/admin-panel/recipes`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateRecipe(id: string, input: RecipeInput): Promise<AdminRecipe> {
    if (!RECIPES_API_READY) {
      const store = getDemoStore();
      const idx = store.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error("Receta no encontrada");
      store[idx] = {
        ...store[idx],
        ...input,
        description: input.description ?? null,
        duration_minutes: input.duration_minutes ?? null,
        servings: input.servings ?? null,
        updated_at: nowIso(),
      };
      return { ...store[idx] };
    }
    return request<AdminRecipe>(`/api/v1/admin-panel/recipes/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  async deleteRecipe(id: string): Promise<void> {
    if (!RECIPES_API_READY) {
      const store = getDemoStore();
      const idx = store.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error("Receta no encontrada");
      store.splice(idx, 1);
      return;
    }
    await request(`/api/v1/admin-panel/recipes/${id}`, { method: "DELETE" });
  },
};
