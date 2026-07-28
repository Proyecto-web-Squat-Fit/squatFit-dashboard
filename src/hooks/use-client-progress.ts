import { useQuery } from "@tanstack/react-query";

import {
  ClientProgressError,
  ClientProgressService,
  type ClientProgress,
} from "@/lib/services/client-progress-service";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const clientProgressKeys = {
  all: ["client-progress"] as const,
  detail: (userId: string) => [...clientProgressKeys.all, userId] as const,
};

/**
 * Serie de progreso de un cliente para la pestaña «Progreso» de la ficha
 * (GET /admin-panel/users/:id/progress).
 *
 * No se reintenta cuando el fallo es 401/403 (sin permiso) ni 404 (usuario
 * inexistente o endpoint aún sin desplegar): reintentar eso solo retrasa el
 * mensaje que el staff tiene que leer. Los fallos de red sí se reintentan una
 * vez.
 */
export function useClientProgress(userId: string) {
  return useQuery<ClientProgress, ClientProgressError>({
    queryKey: clientProgressKeys.detail(userId),
    queryFn: () => ClientProgressService.getProgress(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error instanceof ClientProgressError && (error.isForbidden || error.isNotFound)) return false;
      return failureCount < 1;
    },
  });
}
