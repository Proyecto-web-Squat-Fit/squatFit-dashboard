"use client";

import * as React from "react";

import type { Table } from "@tanstack/react-table";
import { toast } from "sonner";

import { aplicarOrden, vistaEfectiva, type AlcanceVista, type VistaDeTabla } from "@/lib/formato-de-tablas";
import { TableViewsService, type VistasDeTabla } from "@/lib/services/table-views-service";

/**
 * Carga y guarda la vista de una tabla en el SERVIDOR (norma «formato de
 * tablas», punto 2).
 *
 * `useDataTableInstance` sigue leyendo y escribiendo `localStorage`, y eso no se
 * quita: hace de caché para que la tabla pinte con la vista buena en el primer
 * fotograma, sin esperar a la red. Este hook trae la del servidor por encima en
 * cuanto llega, que es la que manda y la que viaja entre navegadores.
 *
 * Se lee el `persistKey` de `table.options.meta` en vez de pasarlo por props
 * para no tener que tocar los seis sitios que ya montan una tabla.
 */
export function useVistaDeTabla(table: Table<unknown>) {
  const persistKey = (table.options.meta as { persistKey?: string } | undefined)?.persistKey;

  const [vistas, setVistas] = React.useState<VistasDeTabla>({ mine: null, team: null });
  const [cargando, setCargando] = React.useState(false);
  const [guardando, setGuardando] = React.useState(false);

  /** Vuelca una vista guardada sobre la tabla. */
  const aplicar = React.useCallback(
    (config: VistaDeTabla) => {
      const idsReales = table.getAllLeafColumns().map((c) => c.id);
      if (config.orden?.length) table.setColumnOrder(aplicarOrden(idsReales, config.orden));
      if (config.visibles) table.setColumnVisibility(config.visibles);
      if (config.anchuras) table.setColumnSizing(config.anchuras);
    },
    [table],
  );

  // Una sola carga al montar. Si el servidor no responde (o el backend todavía
  // no tiene el endpoint), se sigue con lo que haya en localStorage: quedarse
  // sin poder trabajar porque no se pudo leer una preferencia sería absurdo.
  React.useEffect(() => {
    if (!persistKey) return;
    let vivo = true;
    setCargando(true);
    TableViewsService.get(persistKey)
      .then((v) => {
        if (!vivo) return;
        setVistas(v);
        const efectiva = vistaEfectiva(v.mine?.config, v.team?.config);
        if (Object.keys(efectiva).length > 0) aplicar(efectiva);
      })
      .catch(() => {
        /* silencioso a propósito: ver comentario de arriba */
      })
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
    // `aplicar` depende de `table`, que cambia en cada render de TanStack; si se
    // pusiera en las dependencias esto recargaría en bucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey]);

  /** Lo que la tabla tiene ahora mismo, listo para guardar. */
  const vistaActual = React.useCallback((): VistaDeTabla => {
    const estado = table.getState();
    return {
      anchuras: estado.columnSizing,
      orden: estado.columnOrder.length ? estado.columnOrder : table.getAllLeafColumns().map((c) => c.id),
      visibles: estado.columnVisibility,
    };
  }, [table]);

  const guardar = async (alcance: AlcanceVista) => {
    if (!persistKey) return;
    setGuardando(true);
    try {
      const guardada = await TableViewsService.save(persistKey, alcance, vistaActual());
      setVistas((v) => (alcance === "equipo" ? { ...v, team: guardada } : { ...v, mine: guardada }));
      toast.success(alcance === "equipo" ? "Vista guardada para todo el equipo" : "Vista guardada");
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo guardar la vista";
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  /**
   * Restablecer borra TU vista y vuelve a la del equipo, no a las columnas de
   * fábrica: quien pulsa esto quiere «déjalo como lo tiene el equipo», y saltarse
   * lo que fijó el admin sería ignorarlo.
   */
  const restablecer = async () => {
    setGuardando(true);
    try {
      if (persistKey) await TableViewsService.remove(persistKey, "yo").catch(() => undefined);
      table.setColumnOrder([]);
      table.resetColumnVisibility();
      table.resetColumnSizing();
      const equipo = vistas.team?.config;
      if (equipo && Object.keys(equipo).length > 0) {
        aplicar(equipo);
        toast.success("Vista restablecida a la del equipo");
      } else {
        toast.success("Vista restablecida");
      }
      setVistas((v) => ({ ...v, mine: null }));
    } finally {
      setGuardando(false);
    }
  };

  return {
    persistKey,
    /** Qué vista se está aplicando, para poder decírselo a la persona. */
    aplicando: vistas.mine ? ("yo" as const) : vistas.team ? ("equipo" as const) : ("defecto" as const),
    hayVistaDeEquipo: !!vistas.team,
    cargando,
    guardando,
    guardar,
    restablecer,
  };
}
