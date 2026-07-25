"use client";

import { useMemo } from "react";

import { type FilterChipOption } from "@/components/filter-chips";
import { useAdvices } from "@/hooks/use-advices";
import { useEntrenadores } from "@/hooks/use-entrenadores";

/** Id de la pastilla «Sin encargado» (usuarios sin asesoría/staff asignado). */
export const ENCARGADO_NONE = "__none__";

interface AdviserIdentity {
  ids: Set<string>;
  names: Set<string>;
}

type AdviserMatcher = (e: AdviserIdentity) => boolean;

export interface EncargadosFilter {
  /** Opciones para las pastillas: staff (coaches) + nombres sueltos + «Sin encargado». */
  options: FilterChipOption[];
  /**
   * ¿El usuario `userId` casa con alguna pastilla seleccionada?
   * `userId` nulo o sin asesoría solo casa con «Sin encargado».
   */
  matchesUser: (userId: string | null | undefined, selected: string[]) => boolean;
}

/**
 * ENCARGADO (STAFF ASIGNADO) POR USUARIO — filtro compartido Pedidos/Usuarios.
 *
 * El backend no expone un «encargado» directo ni en pedidos ni en la lista de
 * usuarios: la única asignación usuario↔staff disponible es la de las
 * asesorías (GET /admin-panel/advices → user_id + adviser_id/adviser_name).
 * Este hook cruza la lista de staff (GET /admin-panel/coaches, el mismo origen
 * del selector de asignación de otros módulos) con esas asesorías y devuelve
 * las opciones del filtro más un matcher para filtrar EN CLIENTE.
 */
export function useEncargados(): EncargadosFilter {
  // include_inactive: el filtro debe listar también staff de baja con pedidos históricos.
  const { data: coaches = [] } = useEntrenadores({ page: 1, limit: 200, include_inactive: true });
  const { data: advicesData } = useAdvices({ limit: 500, page: 1 });

  return useMemo(() => {
    const advices = advicesData?.advices ?? [];

    // Identidad del encargado por usuario: ids y nombres de sus asesorías.
    const byUser = new Map<string, AdviserIdentity>();
    for (const a of advices) {
      if (!a.user_id) continue;
      const entry = byUser.get(a.user_id) ?? { ids: new Set<string>(), names: new Set<string>() };
      if (a.adviser_id) entry.ids.add(String(a.adviser_id));
      const name = a.adviser_name?.trim();
      if (name) entry.names.add(name.toLowerCase());
      byUser.set(a.user_id, entry);
    }

    const options: FilterChipOption[] = [];
    const matchers = new Map<string, AdviserMatcher>();
    const knownNames = new Set<string>();

    for (const c of coaches) {
      const fullName = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email;
      const key = `coach:${c.id}`;
      const lower = fullName.toLowerCase();
      knownNames.add(lower);
      options.push({ id: key, label: fullName });
      // `adviser_id` puede apuntar al id del coach o a su user_id según el
      // origen del dato; el nombre cubre asesorías antiguas sin id.
      matchers.set(key, (e) => e.ids.has(String(c.id)) || e.ids.has(String(c.user_id)) || e.names.has(lower));
    }

    // Nombres de asesor presentes en asesorías que no casan con ningún coach listado.
    const extraNames = new Map<string, string>(); // lower → original
    for (const a of advices) {
      const name = a.adviser_name?.trim();
      if (name && !knownNames.has(name.toLowerCase()) && !extraNames.has(name.toLowerCase())) {
        extraNames.set(name.toLowerCase(), name);
      }
    }
    for (const [lower, original] of extraNames) {
      const key = `name:${lower}`;
      options.push({ id: key, label: original });
      matchers.set(key, (e) => e.names.has(lower));
    }

    options.push({ id: ENCARGADO_NONE, label: "Sin encargado" });

    const matchesUser = (userId: string | null | undefined, selected: string[]): boolean => {
      const entry = userId ? byUser.get(userId) : undefined;
      const unassigned = !entry || (entry.ids.size === 0 && entry.names.size === 0);
      if (unassigned) return selected.includes(ENCARGADO_NONE);
      return selected.some((key) => key !== ENCARGADO_NONE && (matchers.get(key)?.(entry) ?? false));
    };

    return { options, matchesUser };
  }, [coaches, advicesData]);
}
