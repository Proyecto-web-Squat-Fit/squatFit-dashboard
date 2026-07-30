import type { OpcionCelda } from "@/components/data-table/celda-editable";

/**
 * OPCIONES DE LOS DESPLEGABLES DEL CRM — las mismas que los del Sheet «Leads vía
 * formulario web» (spec de Hamlet, 30-jul-2026).
 *
 * ⚠️ ESTAS LISTAS SON UN ESPEJO. La fuente es el backend:
 * `LEAD_FOLLOW_UPS`, `LEAD_CLOSERS`, `LEAD_SETTERS`, `LEAD_CALL_RESULTS` y
 * `LEAD_ORIGIN_DETAILS` en `src/squat-fit/leads/dto/lead.dto.ts`. Si se toca una
 * aquí y no allí, el desplegable ofrecerá un valor que el PUT rechazará con 400.
 * Si se añade un closer, se añade en los dos sitios.
 *
 * Los textos van con el mismo acento y las mismas mayúsculas que la hoja porque
 * el valor viaja tal cual: no hay traducción de slugs por el medio.
 */

/** Gris neutro para lo que no tiene color propio. */
const NEUTRO = "bg-muted text-muted-foreground";

/**
 * Columna D del Sheet, «Llamada» (antes se llamaba «Estado»).
 *
 * OJO: el campo `status` del lead tiene OCHO valores —arrastra nuevo,
 * contactado, esperando_pago, ganado y perdido, que usa el kanban del
 * pipeline—, pero el desplegable de esta columna solo ofrece los TRES de la
 * hoja. Si un lead está en otro estado, la píldora lo enseña tal cual (con
 * `ESTADOS_KANBAN` de abajo) y elegir uno de los tres lo mueve; no se ocultan
 * los otros cinco, porque entonces media tabla saldría vacía.
 */
export const OPCIONES_LLAMADA: readonly OpcionCelda[] = [
  { valor: "agendado", etiqueta: "Agendada", clase: "bg-amber-100 text-amber-800" },
  { valor: "realizada", etiqueta: "Realizada", clase: "bg-green-700 text-white" },
  { valor: "seguimiento", etiqueta: "Seguimiento", clase: "bg-sky-100 text-sky-800" },
];

/** Los otros cinco valores de `status`, para poder pintarlos aunque no se ofrezcan. */
export const ESTADOS_KANBAN: readonly OpcionCelda[] = [
  { valor: "nuevo", etiqueta: "Nuevo", clase: "bg-slate-100 text-slate-700" },
  { valor: "contactado", etiqueta: "Contactado", clase: "bg-indigo-100 text-indigo-800" },
  { valor: "esperando_pago", etiqueta: "Esperando pago", clase: "bg-violet-100 text-violet-800" },
  { valor: "ganado", etiqueta: "Ganado", clase: "bg-green-100 text-green-800" },
  { valor: "perdido", etiqueta: "Perdido", clase: "bg-rose-100 text-rose-800" },
];

/** Lo que se le pasa a la celda de «Llamada»: los tres primeros + los otros para pintar. */
export const OPCIONES_LLAMADA_COMPLETAS: readonly OpcionCelda[] = [...OPCIONES_LLAMADA, ...ESTADOS_KANBAN];

/** Columna E, «Seguimiento». Del más urgente al menos, como en la hoja. */
export const OPCIONES_SEGUIMIENTO: readonly OpcionCelda[] = [
  { valor: "A las 24 h", clase: "bg-green-100 text-green-800" },
  { valor: "A los 2 d", clase: "bg-purple-100 text-purple-800" },
  { valor: "A los 3 d", clase: "bg-slate-100 text-slate-700" },
  { valor: "A los 4 d", clase: "bg-sky-100 text-sky-800" },
  { valor: "A los 7 d", clase: "bg-amber-100 text-amber-800" },
  { valor: "En 30+ d", clase: "bg-orange-100 text-orange-800" },
];

/**
 * Columna H, «Closer». Los emojis los eligió Hamlet y son de cada persona: Roger
 * 💪🏻, Daniela 🔥, Janneth 🚀. María y Hamlet no llevan.
 */
export const OPCIONES_CLOSER: readonly OpcionCelda[] = [
  { valor: "Roger", prefijo: "💪🏻", clase: "bg-[#EBEAF2] text-[#363C98]" },
  { valor: "Daniela", prefijo: "🔥", clase: "bg-[#EBEAF2] text-[#363C98]" },
  { valor: "Janneth", prefijo: "🚀", clase: "bg-[#EBEAF2] text-[#363C98]" },
  { valor: "Maria", clase: "bg-[#EBEAF2] text-[#363C98]" },
  { valor: "Hamlet", clase: "bg-[#EBEAF2] text-[#363C98]" },
];

/**
 * Columna F, «Setter». «Descartar» no es una persona: es la marca de que ese lead
 * no se trabaja, y va en rojo para que no se confunda con un nombre.
 */
export const OPCIONES_SETTER: readonly OpcionCelda[] = [
  { valor: "Karl", clase: "bg-teal-100 text-teal-800" },
  { valor: "Maria", clase: "bg-teal-100 text-teal-800" },
  { valor: "Zerochats", clase: "bg-cyan-100 text-cyan-800" },
  { valor: "Descartar", clase: "bg-rose-100 text-rose-700" },
];

/**
 * Columna I, «Resultado». Los colores agrupan por lo que significan, que es lo
 * que se lee de un vistazo en una tabla larga: verde = ha entrado, rojo = no ha
 * cerrado, ámbar = sigue vivo, gris = incidencia.
 */
export const OPCIONES_RESULTADO: readonly OpcionCelda[] = [
  { valor: "No show", clase: "bg-slate-200 text-slate-700" },
  { valor: "No cierre - precio", clase: "bg-rose-100 text-rose-700" },
  { valor: "No cierre - indeciso", clase: "bg-rose-100 text-rose-700" },
  { valor: "No cierre - otros", clase: "bg-rose-100 text-rose-700" },
  { valor: "Acceso Premium", clase: "bg-green-700 text-white" },
  { valor: "Acceso Estandar", clase: "bg-green-100 text-green-800" },
  { valor: "Acceso individual", clase: "bg-emerald-100 text-emerald-800" },
  { valor: "Esperando pago", clase: "bg-violet-100 text-violet-800" },
  { valor: "Reagendada", clase: "bg-amber-100 text-amber-800" },
  { valor: "Darle seguimiento", clase: "bg-sky-100 text-sky-800" },
  { valor: "Otro problema", clase: NEUTRO },
];

/**
 * Columna M, «Origen» (el fino). Colores por plataforma, iguales a las etiquetas
 * de la hoja: YouTube rojo, Stories gris, IG-Bio amarillo, TikTok negro.
 */
export const OPCIONES_ORIGEN: readonly OpcionCelda[] = [
  { valor: "YouTube-Maria", clase: "bg-red-100 text-red-700" },
  { valor: "YouTube-Hamlet", clase: "bg-red-100 text-red-700" },
  { valor: "Stories-Maria", clase: "bg-slate-100 text-slate-700" },
  { valor: "Stories-Hamlet", clase: "bg-slate-100 text-slate-700" },
  { valor: "IG-Bio-Maria", clase: "bg-yellow-100 text-yellow-800" },
  { valor: "IG-Bio-Hamlet", clase: "bg-yellow-100 text-yellow-800" },
  { valor: "TikTok-Maria", clase: "bg-neutral-800 text-white" },
  { valor: "TikTok-Hamlet", clase: "bg-neutral-800 text-white" },
  { valor: "Emails", clase: "bg-blue-100 text-blue-700" },
  { valor: "Guias", clase: "bg-cyan-100 text-cyan-800" },
  { valor: "Sorteo", clase: "bg-stone-200 text-stone-800" },
];
