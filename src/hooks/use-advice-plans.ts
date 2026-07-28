import { useQuery } from "@tanstack/react-query";

import { AdvicePlansPermissionError, AdvicePlansService, type AdvicePlan } from "@/lib/services/advice-plans-service";

export const advicePlansKeys = {
  all: ["advice-plans"] as const,
  list: () => [...advicePlansKeys.all, "list"] as const,
};

/**
 * Planes de asesoría (`suscription_plan`). Solo lectura: el backend no expone
 * crear/editar/borrar aquí a propósito (la gestión sigue en el módulo de
 * Asesorías). Sin paginación ni filtros en el backend: trae el array completo
 * ordenado por nombre; la búsqueda/estado se filtran en el cliente.
 *
 * Sin reintento si el fallo es de permisos (`AdvicePlansPermissionError`):
 * es un 401 determinista del backend, reintentar no cambia el resultado.
 */
export function useAdvicePlans() {
  return useQuery<AdvicePlan[]>({
    queryKey: advicePlansKeys.list(),
    queryFn: () => AdvicePlansService.list(),
    staleTime: 60 * 1000,
    retry: (failureCount, err) => !(err instanceof AdvicePlansPermissionError) && failureCount < 1,
    refetchOnWindowFocus: false,
  });
}
