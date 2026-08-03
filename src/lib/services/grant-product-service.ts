import { getAuthToken } from "@/lib/auth/auth-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

import { CursosService } from "./cursos-service";
import { LibrosService } from "./libros-service";

// ============================================================================
// GRANT PRODUCT
// ----------------------------------------------------------------------------
// `POST /api/v1/admin-panel/grant-product` (desplegado 19 jul 2026, lote 3).
// El DTO del backend valida con forbidNonWhitelisted y SOLO acepta
// { user_id, product_type: 'course'|'book', product_id } — nada de campos
// extra (order_id daría 400) ni packs.
// ============================================================================
export const GRANT_PRODUCT_ENDPOINT = "/api/v1/admin-panel/grant-product";
export const GRANT_PRODUCT_AVAILABLE = true;

export type GrantableProductType = "course" | "book" | "pack" | "product";

export interface GrantableProduct {
  id: string;
  name: string;
  type: GrantableProductType;
  price?: number;
}

export interface GrantProductPayload {
  userId: string;
  productId: string;
  productType: GrantableProductType;
  /** Contexto opcional: id del pedido desde el que se concede. */
  orderId?: string;
}

export class GrantProductService {
  /**
   * Reúne todos los productos concebibles (cursos, libros y packs) en una lista
   * homogénea para el selector. Tolera que algún catálogo falle (devuelve el
   * resto). Ordenado por tipo y nombre.
   */
  static async getGrantableProducts(): Promise<GrantableProduct[]> {
    const [cursos, libros] = await Promise.allSettled([CursosService.getCursos(), LibrosService.getLibros()]);

    const out: GrantableProduct[] = [];

    if (cursos.status === "fulfilled") {
      for (const c of cursos.value) out.push({ id: c.id, name: c.name, type: "course", price: c.price });
    }
    if (libros.status === "fulfilled") {
      for (const l of libros.value) {
        // El precio del libro vive en sus versiones; usamos la más barata como referencia.
        const prices = (l.versions ?? [])
          .map((v) => Number(v.version_price))
          .filter((n) => Number.isFinite(n) && n > 0);
        out.push({
          id: l.id,
          name: l.title,
          type: "book",
          price: prices.length ? Math.min(...prices) : undefined,
        });
      }
    }
    // Los packs quedan fuera: el endpoint grant-product solo admite course|book.

    return out.sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
  }

  /**
   * Concede un producto a un usuario. Lanza un error claro mientras el backend
   * no exponga el endpoint (GRANT_PRODUCT_AVAILABLE === false).
   */
  static async grantProduct(payload: GrantProductPayload): Promise<void> {
    if (!GRANT_PRODUCT_AVAILABLE) {
      throw new Error(
        "El endpoint para asignar productos (grant-product) todavía no está disponible en el backend (Fase 2). La acción quedará operativa en cuanto se despliegue.",
      );
    }

    const token = getAuthToken() ?? (typeof window !== "undefined" ? localStorage.getItem("authToken") : null);
    const res = await fetch(`${API_BASE_URL}${GRANT_PRODUCT_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        user_id: payload.userId,
        product_id: payload.productId,
        product_type: payload.productType,
        // payload.orderId es solo contexto de UI: el DTO del backend
        // (forbidNonWhitelisted) rechaza cualquier campo extra.
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? body.error ?? `Error ${res.status} al asignar el producto`);
    }
  }
}
