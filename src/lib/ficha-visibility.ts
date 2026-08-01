// ============================================================================
// FICHA TÉCNICA DEL CLIENTE — matriz de visibilidad por rol (Doc 0, 1.5–1.6)
// ----------------------------------------------------------------------------
// Cada sección de la ficha se muestra u oculta según el rol de staff del token.
// La matriz vive SOLO en el front (defensa de UI); el backend deberá aplicar el
// mismo criterio en sus endpoints cuando exponga los datos sensibles (ver
// INFORME-FASE-17 § contrato). Un rol desconocido ve únicamente «datos».
// ============================================================================

import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  HeartPulse,
  KeyRound,
  MessagesSquare,
  NotebookPen,
  ShoppingBag,
  Target,
  TrendingUp,
  User2,
} from "lucide-react";

/** Roles de staff (espejo de STAFF_ROLES en jwt-utils, sin tocar ese módulo). */
export type StaffRole = "admin" | "adviser" | "dietitian" | "sales" | "psychologist" | "support_agent";

export type FichaSectionId =
  | "datos"
  | "accesos"
  | "compras"
  | "salud"
  | "objetivos"
  | "progreso"
  | "chats"
  | "formularios"
  | "notas";

export interface FichaSection {
  id: FichaSectionId;
  label: string;
  icon: LucideIcon;
}

/** Todas las secciones de la ficha, en el orden en que se muestran. */
export const FICHA_SECTIONS: FichaSection[] = [
  { id: "datos", label: "Datos de usuario", icon: User2 },
  { id: "objetivos", label: "Objetivos", icon: Target },
  { id: "salud", label: "Medidas y salud", icon: HeartPulse },
  { id: "progreso", label: "Progreso", icon: TrendingUp },
  { id: "accesos", label: "Accesos concedidos", icon: KeyRound },
  { id: "compras", label: "Compras", icon: ShoppingBag },
  { id: "formularios", label: "Formularios", icon: ClipboardList },
  { id: "notas", label: "Notas de staff", icon: NotebookPen },
  { id: "chats", label: "Chats", icon: MessagesSquare },
];

const ALL: FichaSectionId[] = FICHA_SECTIONS.map((s) => s.id);

/**
 * Qué ve cada rol (Doc 0 1.5–1.6):
 *  • admin — todo.
 *  • adviser (asesor) — acompaña al cliente: todo menos compras (importes).
 *  • dietitian — datos, objetivos, salud, progreso y formularios (+notas).
 *  • sales — lo comercial: datos, accesos, compras y notas; sin datos de salud.
 *  • psychologist — datos, objetivos, formularios y notas; sin compras ni medidas.
 *  • support_agent — resolución de incidencias: datos, accesos y compras.
 *
 * «chats» (historial de WhatsApp, F3 nº 139) solo entra en el `ALL` de admin
 * a propósito: el permiso `wa-history` del backend hoy es SOLO admin
 * (migración 20260728170000), así que a cualquier otro rol el backend le
 * respondería 401 igualmente. Si el permiso se abre a más roles más adelante,
 * añadir «chats» aquí a los que corresponda.
 */
export const FICHA_VISIBILITY: Record<StaffRole, FichaSectionId[]> = {
  admin: ALL,
  adviser: ["datos", "objetivos", "salud", "progreso", "accesos", "formularios", "notas"],
  dietitian: ["datos", "objetivos", "salud", "progreso", "formularios", "notas"],
  sales: ["datos", "accesos", "compras", "notas"],
  psychologist: ["datos", "objetivos", "formularios", "notas"],
  support_agent: ["datos", "accesos", "compras"],
};

/** Secciones visibles para un rol; rol desconocido o ausente → solo «datos». */
export function visibleFichaSections(role: string | null | undefined): FichaSection[] {
  const allowed =
    role && role in FICHA_VISIBILITY ? FICHA_VISIBILITY[role as StaffRole] : (["datos"] as FichaSectionId[]);
  return FICHA_SECTIONS.filter((s) => allowed.includes(s.id));
}

/** ¿Puede el rol conceder productos (grant) desde la ficha? Solo admin. */
export function canGrantProducts(role: string | null | undefined): boolean {
  return role === "admin";
}
