/**
 * FORMATO DE TABLAS — la norma de Hamlet (30-jul-2026) para TODA tabla del back
 * office, en código. La spec en prosa está en ~/Development/FORMATO-DE-TABLAS.md.
 *
 * Antes de esto cada tabla decidía por su cuenta: Pedidos y Usuarios tenían
 * anchura personalizable y ocultar/mostrar, otras no; nadie podía reordenar
 * columnas (el `columnOrder` estaba en el estado pero ningún componente lo
 * cambiaba); y no había forma de compartir una vista con el equipo. Este módulo
 * es el único sitio donde se define qué significa «una tabla del back office».
 *
 * Lo que NO va aquí: las opciones de cada desplegable. Esas son del dominio y
 * salen del backend (`LEAD_*` en leads/dto/lead.dto.ts). Aquí solo vive la
 * mecánica de la tabla.
 */

/** Roles de staff, tal como llegan en el token (`role`). */
export type RolStaff = "admin" | "adviser" | "support" | "trainer" | "nutritionist" | string;

/**
 * A quién afecta una vista guardada.
 *
 * `equipo` es la vista por defecto para quien no tenga una propia. Solo el admin
 * puede escribirla; el resto solo puede guardar la suya.
 */
export type AlcanceVista = "yo" | "equipo";

/** Lo que se guarda de una tabla: anchuras, orden y qué está oculto. */
export interface VistaDeTabla {
  /** id de columna → ancho en px. Sin mínimo: el usuario puede dejarla en un hilo. */
  anchuras?: Record<string, number>;
  /** ids de columna en el orden elegido. Las que falten van detrás, en su orden natural. */
  orden?: string[];
  /** id de columna → visible. Lo que no aparezca se considera visible. */
  visibles?: Record<string, boolean>;
}

/**
 * Metadatos que cada columna declara en su `meta`. TanStack los pasa tal cual,
 * así que es el sitio natural para colgar lo que la norma necesita saber.
 */
export interface MetaColumna {
  /** Nombre en español para la cabecera y la lista de «Vista». Sin esto sale el id. */
  label?: string;
  /**
   * Roles que NO pueden ocultar esta columna. El admin nunca está aquí: puede
   * ocultar lo que quiera. Se declara por rol y no con un booleano porque la
   * misma columna es imprescindible para unos y ruido para otros: «Closer» la
   * necesita un asesor y le da igual a soporte.
   */
  obligatoriaPara?: RolStaff[];
}

/**
 * ¿Puede este rol ocultar esta columna?
 *
 * El admin siempre puede. Para el resto, manda `obligatoriaPara`. Una columna
 * obligatoria NO se esconde de la lista de «Vista»: se enseña deshabilitada, para
 * que quien la busque entienda que existe y que no se toca — si desaparece, la
 * gente cree que se ha roto algo y pregunta.
 */
export function puedeOcultar(meta: MetaColumna | undefined, rol: RolStaff | null): boolean {
  if (rol === "admin") return true;
  if (!meta?.obligatoriaPara?.length) return true;
  return !meta.obligatoriaPara.includes(rol ?? "");
}

/** ¿Puede este rol guardar la vista del equipo? */
export function puedeGuardarParaElEquipo(rol: RolStaff | null): boolean {
  return rol === "admin";
}

/**
 * Sin anchura mínima, que es lo que pidió Hamlet expresamente. TanStack usa
 * `minSize: 20` por defecto y eso impedía estrechar una columna más allá de ahí.
 * Se deja en 1 y no en 0 porque con 0 el navegador colapsa la celda a nada y la
 * manija de arrastre deja de poder cogerse: la columna quedaría inrecuperable
 * sin ir a «restablecer».
 */
export const ANCHURA_MINIMA = 1;

/** Ancho por defecto de una columna que no declare `size`. */
export const ANCHURA_POR_DEFECTO = 150;

/**
 * Aplica un orden guardado a la lista real de columnas.
 *
 * Tolerante a propósito en los dos sentidos, porque el código cambia y las vistas
 * guardadas no: las columnas guardadas que ya no existen se ignoran, y las
 * columnas nuevas que nadie ha ordenado todavía van **al final**, en su orden
 * natural. Así añadir una columna al código no rompe la vista de nadie ni la
 * hace desaparecer.
 */
export function aplicarOrden(idsReales: string[], ordenGuardado?: string[]): string[] {
  if (!ordenGuardado?.length) return idsReales;
  const existentes = new Set(idsReales);
  const ordenadas = ordenGuardado.filter((id) => existentes.has(id));
  const yaPuestas = new Set(ordenadas);
  return [...ordenadas, ...idsReales.filter((id) => !yaPuestas.has(id))];
}

/**
 * Mueve una columna delante de otra, que es lo que hacen los dos arrastres (el
 * de la cabecera y el de la lista de «Vista»). Devuelve un array nuevo.
 */
export function moverColumna(orden: string[], desde: string, hasta: string): string[] {
  if (desde === hasta) return orden;
  const i = orden.indexOf(desde);
  const j = orden.indexOf(hasta);
  if (i === -1 || j === -1) return orden;
  const copia = [...orden];
  copia.splice(i, 1);
  copia.splice(j, 0, desde);
  return copia;
}

// ─── Texto de una celda ──────────────────────────────────────────────────────

/**
 * Cómo se comporta el texto largo dentro de una celda: **se ajusta al ancho de
 * la columna y salta de línea**. Nunca se corta.
 *
 * Antes cada celda con texto largo usaba `truncate`, que lo deja en una sola
 * línea y esconde el resto detrás del borde de la columna. Con anchura
 * personalizable (que es la norma desde el 30-jul) eso es especialmente malo:
 * el usuario estrecha una columna y el dato desaparece sin avisar de que hay
 * más. En «Productos» y «Origen» de Pedidos se veía a diario — «Pack Vol. 1 y
 * 2» quedaba en «Pack Vol. 1 y…» o directamente cortado a media palabra.
 *
 * `break-words` es imprescindible además de `whitespace-normal`: sin él una URL
 * o un identificador sin espacios no tiene por dónde partirse y vuelve a
 * desbordar, que es justo lo que se quería evitar.
 */
export const CLASE_CELDA_AJUSTADA = "whitespace-normal break-words";

// ─── Importes ────────────────────────────────────────────────────────────────

const SIMBOLO_MONEDA: Record<string, string> = {
  eur: "€",
  usd: "$",
  gbp: "£",
  mxn: "$",
  cop: "$",
  clp: "$",
  pen: "S/",
};

/**
 * Importe de una tabla del back office: **dos decimales separados por un punto**
 * y el símbolo detrás («49.00 €»).
 *
 * El punto es decisión explícita de Hamlet (3-ago-2026). El panel lo tenía de
 * las tres maneras a la vez: `toFixed(2)` (punto) en Pedidos, `Intl.NumberFormat
 * ("es-ES")` (coma) en las tarjetas de inicio y en Marketing, y `€` DELANTE del
 * número en Packs. Tres formatos para la misma cifra obligan a mirar dos veces
 * cuál es cuál al comparar dos pantallas.
 *
 * Una moneda que no esté en la tabla se pinta con su código en mayúsculas
 * («1200.00 BRL»): es feo, pero es correcto, y mejor que inventarse un símbolo.
 */
export function formatearImporte(valor: number | string | null | undefined, moneda = "eur"): string {
  const n = typeof valor === "number" ? valor : parseFloat(String(valor ?? ""));
  const cifra = Number.isFinite(n) ? n : 0;
  const codigo = (moneda || "eur").toLowerCase();
  return `${cifra.toFixed(2)} ${SIMBOLO_MONEDA[codigo] ?? codigo.toUpperCase()}`;
}

/**
 * Precedencia al cargar: **vista propia → vista del equipo → columnas por
 * defecto del código**.
 *
 * La propia gana ENTERA, no campo a campo. Mezclarlas dejaría vistas híbridas
 * que nadie ha elegido: si el admin reordena la del equipo, alguien con vista
 * propia se encontraría sus columnas movidas sin haber tocado nada. Cambiarle la
 * pantalla a una persona por debajo es peor que dejarle una vista
 * desactualizada.
 */
export function vistaEfectiva(propia?: VistaDeTabla | null, equipo?: VistaDeTabla | null): VistaDeTabla {
  if (propia && Object.keys(propia).length > 0) return propia;
  if (equipo && Object.keys(equipo).length > 0) return equipo;
  return {};
}
