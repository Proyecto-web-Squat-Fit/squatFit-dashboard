import apiClient from "@/lib/api-client";
import type { AlcanceVista, VistaDeTabla } from "@/lib/formato-de-tablas";

/**
 * Vistas de tabla guardadas en el servidor (norma «formato de tablas», punto 2).
 *
 * Antes esto vivía solo en `localStorage`, que es por NAVEGADOR: la misma
 * persona veía una cosa en el portátil y otra en el ordenador de la oficina, y
 * compartir una vista con el equipo era imposible.
 *
 * localStorage no se quita: se queda como caché para que la tabla pinte con la
 * vista buena en el primer fotograma, sin esperar a la red. La del servidor
 * manda en cuanto llega.
 */

const RUTA = "/api/v1/admin-panel/table-views";

export interface VistaGuardada {
  scope: "user" | "team";
  config: VistaDeTabla;
  updated_at: string;
}

export interface VistasDeTabla {
  /** La de quien pregunta. */
  mine: VistaGuardada | null;
  /** La que fijó el admin para todos. */
  team: VistaGuardada | null;
}

/** Traduce el alcance de la interfaz («yo»/«equipo») al del contrato. */
function alcanceApi(alcance: AlcanceVista): "user" | "team" {
  return alcance === "equipo" ? "team" : "user";
}

export class TableViewsService {
  static async get(persistKey: string): Promise<VistasDeTabla> {
    const { data } = await apiClient.get<VistasDeTabla>(`${RUTA}/${encodeURIComponent(persistKey)}`);
    // Se normaliza a null en vez de devolver `data` tal cual porque el
    // contrato promete las dos claves y un backend antiguo (antes de la
    // revisión 00351) devolvería 404 o un objeto sin ellas.
    return { mine: data.mine ?? null, team: data.team ?? null };
  }

  static async save(persistKey: string, alcance: AlcanceVista, config: VistaDeTabla): Promise<VistaGuardada> {
    const { data } = await apiClient.put<VistaGuardada>(`${RUTA}/${encodeURIComponent(persistKey)}`, {
      scope: alcanceApi(alcance),
      config,
    });
    return data;
  }

  static async remove(persistKey: string, alcance: AlcanceVista): Promise<void> {
    await apiClient.delete(`${RUTA}/${encodeURIComponent(persistKey)}?scope=${alcanceApi(alcance)}`);
  }
}
