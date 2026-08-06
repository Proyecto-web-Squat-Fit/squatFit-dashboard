import { getAuthToken } from "@/lib/auth/auth-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

import { CursosService } from "./cursos-service";
import { LibrosService } from "./libros-service";
import { ProductsService } from "./products-service";

// ============================================================================
// GRANT PRODUCT
// ----------------------------------------------------------------------------
// `POST /api/v1/admin-panel/grant-product` (desplegado 19 jul 2026, lote 3).
// El DTO del backend valida con forbidNonWhitelisted: nada de campos extra
// (order_id daría 400).
//
// PROGRAMAS, desde el 6-ago-2026 (backend PR #195). Antes el endpoint solo
// aceptaba 'course'|'book' y aquí no había forma de dar un programa a mano.
// Eso importaba más de lo que parece: quien paga un programa por un enlace de
// pago de Stripe no recibe nada —esos enlaces no llevan metadata, así que el
// webhook no sabe qué conceder—, la campana avisa de que «hay que darle el alta
// y el acceso a mano», y no se podía. Ahora sí.
//
// El backend acepta ya { user_id, product_type: 'course'|'book'|'program',
// product_id } y, para los programas, un `months` opcional. Al conceder un
// programa se le da además el curso incluido y, si es Premium, las sesiones en
// vivo: delega en `grantProgram`, el mismo camino que usa el webhook de Stripe.
// ============================================================================
export const GRANT_PRODUCT_ENDPOINT = "/api/v1/admin-panel/grant-product";
export const GRANT_PRODUCT_AVAILABLE = true;

export type GrantableProductType = "course" | "book" | "program" | "pack" | "product";

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
  /** Solo para programas: meses de acceso. Sin él manda el del producto (o 6). */
  months?: number;
}

export class GrantProductService {
  /**
   * Reúne todo lo que se puede conceder —cursos, libros y programas— en una
   * lista homogénea para el selector. Tolera que algún catálogo falle (devuelve
   * el resto). Ordenado por tipo y nombre.
   */
  static async getGrantableProducts(): Promise<GrantableProduct[]> {
    const [cursos, libros, productos] = await Promise.allSettled([
      CursosService.getCursos(),
      LibrosService.getLibros(),
      ProductsService.list(),
    ]);

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
    // Programas: las filas de `products` con grant_type='program'. Se incluyen
    // aunque estén INACTIVAS a propósito — hoy los cuatro programas TMV lo
    // están, y aun así hay clientes pagándolos; `grantProgram` no mira `active`,
    // y lo que se necesita es poder darles lo que ya han pagado.
    if (productos.status === "fulfilled") {
      for (const p of productos.value) {
        if (p.grantType !== "program") continue;
        out.push({ id: p.id, name: p.name, type: "program", price: p.price });
      }
    }

    // Los packs quedan fuera: el endpoint grant-product no los admite.

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
        ...(payload.productType === "program" && payload.months ? { months: payload.months } : {}),
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
