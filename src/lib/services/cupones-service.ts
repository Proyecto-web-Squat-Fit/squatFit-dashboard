// ============================================================================
// Servicio de CUPONES del back office (reestructura 27-jul)
// ----------------------------------------------------------------------------
// El backend NO tiene endpoints de cupones (ni proxy a Stripe Coupons /
// Promotion Codes). Mientras tanto, COUPONS_API_READY = false: la página
// funciona con un banco demo en memoria y un aviso, igual que se hizo con
// recetas y con el contenido de cursos. Al desplegar los endpoints
// (propuesta: admin-panel/coupons/*), poner el flag a true y completar los
// métodos request() — la UI ya está lista.
// ============================================================================

// Encender cuando el backend exponga admin-panel/coupons/* (o proxy Stripe).
export const COUPONS_API_READY = false;

export interface Cupon {
  id: string;
  /** Código que escribe el cliente, p. ej. SQUAD10. */
  codigo: string;
  /** Descuento: porcentaje (10 = 10 %) o importe fijo en euros. */
  tipo: "porcentaje" | "importe";
  valor: number;
  /** A qué aplica: todo el catálogo o un ámbito concreto. */
  ambito: string;
  activo: boolean;
  /** Fecha de caducidad ISO o null si no caduca. */
  caduca: string | null;
  /** Canjes acumulados. */
  canjes: number;
}

let demoStore: Cupon[] | null = null;

function demoCupones(): Cupon[] {
  return [
    {
      id: "demo-c-1",
      codigo: "SQUAD10",
      tipo: "porcentaje",
      valor: 10,
      ambito: "Todo el catálogo",
      activo: true,
      caduca: "2026-09-30",
      canjes: 42,
    },
    {
      id: "demo-c-2",
      codigo: "COCINA5",
      tipo: "importe",
      valor: 5,
      ambito: "Libros de cocina",
      activo: true,
      caduca: null,
      canjes: 17,
    },
    {
      id: "demo-c-3",
      codigo: "VERANO25",
      tipo: "porcentaje",
      valor: 25,
      ambito: "Cursos",
      activo: false,
      caduca: "2026-08-31",
      canjes: 89,
    },
  ];
}

function getStore(): Cupon[] {
  demoStore ??= demoCupones();
  return demoStore;
}

export const CuponesService = {
  ready: COUPONS_API_READY,

  async getCupones(): Promise<Cupon[]> {
    // TODO cuando COUPONS_API_READY: GET admin-panel/coupons
    return getStore().map((c) => ({ ...c }));
  },

  async createCupon(input: Omit<Cupon, "id" | "canjes">): Promise<Cupon> {
    // TODO cuando COUPONS_API_READY: POST admin-panel/coupons
    const cupon: Cupon = { ...input, id: `demo-c-${Date.now()}`, canjes: 0 };
    getStore().unshift(cupon);
    return cupon;
  },

  async toggleCupon(id: string): Promise<void> {
    // TODO cuando COUPONS_API_READY: PATCH admin-panel/coupons/:id
    const c = getStore().find((x) => x.id === id);
    if (c) c.activo = !c.activo;
  },

  async deleteCupon(id: string): Promise<void> {
    // TODO cuando COUPONS_API_READY: DELETE admin-panel/coupons/:id
    demoStore = getStore().filter((x) => x.id !== id);
  },
};
