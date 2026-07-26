import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Entrenador } from "@/app/(main)/dashboard/equipo/_components/schema";
import {
  EntrenadoresService,
  CreateEntrenadorDto,
  GetEntrenadoresParams,
  UpdateEntrenadorDto,
} from "@/lib/services/entrenadores-service";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const entrenadoresKeys = {
  all: ["entrenadores"] as const,
  lists: () => [...entrenadoresKeys.all, "list"] as const,
  list: (params?: GetEntrenadoresParams) => [...entrenadoresKeys.lists(), params] as const,
  details: () => [...entrenadoresKeys.all, "detail"] as const,
  detail: (id: string) => [...entrenadoresKeys.details(), id] as const,
};

// ============================================================================
// QUERIES - LECTURA DE DATOS
// ============================================================================

/**
 * Hook para obtener todos los entrenadores
 * @param params - Parámetros de filtrado (opcional)
 */
export function useEntrenadores(params?: GetEntrenadoresParams) {
  return useQuery({
    queryKey: entrenadoresKeys.list(params),
    queryFn: () => EntrenadoresService.getEntrenadores(params),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook para obtener un entrenador específico por ID
 * @param id - ID del entrenador
 */
export function useEntrenador(id: string) {
  return useQuery({
    queryKey: entrenadoresKeys.detail(id),
    queryFn: () => EntrenadoresService.getEntrenadorById(id),
    enabled: !!id, // Solo ejecuta si hay ID
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// ============================================================================
// MUTATIONS - ESCRITURA DE DATOS
// ============================================================================

/**
 * Hook para crear un nuevo entrenador
 */
export function useCreateEntrenador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEntrenadorDto) => EntrenadoresService.createEntrenador(data),
    onMutate: async () => {
      toast.loading("Creando entrenador...", { id: "create-entrenador" });
    },
    onSuccess: (newEntrenador) => {
      // Invalidar queries para refrescar la lista
      queryClient.invalidateQueries({ queryKey: entrenadoresKeys.lists() });

      // Opcional: Agregar el nuevo entrenador al cache
      queryClient.setQueryData(entrenadoresKeys.detail(newEntrenador.id), newEntrenador);

      toast.success("Entrenador creado exitosamente", { id: "create-entrenador" });
    },
    onError: (error: Error) => {
      console.error("Error creando entrenador:", error);
      toast.error(error.message || "Error al crear el entrenador", { id: "create-entrenador" });
    },
  });
}

/**
 * Hook para cambiar el rol formal del staff (píldora Rol de la tabla Equipo).
 * Usa el endpoint admin users/edit (campo user.staff_role).
 */
export function useUpdateEntrenadorRol() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, rol }: { userId: string; rol: string }) => {
      const { UsersService } = await import("@/lib/services/users-service");
      return UsersService.updateUser({ user_id: userId, staff_role: rol });
    },
    onSuccess: (_data, { rol }) => {
      queryClient.invalidateQueries({ queryKey: entrenadoresKeys.lists() });
      toast.success(`Rol cambiado a ${rol}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al cambiar el rol");
    },
  });
}

/**
 * Hook para actualizar un entrenador existente
 */
export function useUpdateEntrenador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UpdateEntrenadorDto> }) =>
      EntrenadoresService.updateEntrenador(id, data),
    onMutate: async ({ id }) => {
      toast.loading("Actualizando entrenador...", { id: `update-entrenador-${id}` });

      // Cancelar queries en curso para evitar conflictos
      await queryClient.cancelQueries({ queryKey: entrenadoresKeys.detail(id) });

      // Guardar snapshot del estado anterior (para rollback)
      const previousEntrenador = queryClient.getQueryData<Entrenador>(entrenadoresKeys.detail(id));

      return { previousEntrenador, id };
    },
    onSuccess: (updatedEntrenador, { id }) => {
      // Actualizar cache del entrenador específico
      queryClient.setQueryData(entrenadoresKeys.detail(id), updatedEntrenador);

      // Invalidar lista para refrescar
      queryClient.invalidateQueries({ queryKey: entrenadoresKeys.lists() });

      toast.success("Entrenador actualizado exitosamente", { id: `update-entrenador-${id}` });
    },
    onError: (error: Error, { id }, context) => {
      // Rollback en caso de error
      if (context?.previousEntrenador) {
        queryClient.setQueryData(entrenadoresKeys.detail(id), context.previousEntrenador);
      }

      console.error("Error actualizando entrenador:", error);
      toast.error(error.message || "Error al actualizar el entrenador", { id: `update-entrenador-${id}` });
    },
  });
}

/**
 * Hook para eliminar un entrenador
 */
export function useDeleteEntrenador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => EntrenadoresService.deleteEntrenador(id),
    onMutate: async (id) => {
      toast.loading("Eliminando entrenador...", { id: `delete-entrenador-${id}` });

      // Cancelar queries relacionadas
      await queryClient.cancelQueries({ queryKey: entrenadoresKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: entrenadoresKeys.lists() });

      // Guardar snapshot para rollback
      const previousEntrenadores = queryClient.getQueryData<Entrenador[]>(entrenadoresKeys.lists());

      // Optimistic update: remover de la lista
      if (previousEntrenadores) {
        queryClient.setQueryData(
          entrenadoresKeys.lists(),
          previousEntrenadores.filter((entrenador) => entrenador.id !== id),
        );
      }

      return { previousEntrenadores };
    },
    onSuccess: (_, id) => {
      // Remover del cache individual
      queryClient.removeQueries({ queryKey: entrenadoresKeys.detail(id) });

      // Invalidar lista
      queryClient.invalidateQueries({ queryKey: entrenadoresKeys.lists() });

      toast.success("Entrenador eliminado exitosamente", { id: `delete-entrenador-${id}` });
    },
    onError: (error: Error, id, context) => {
      // Rollback en caso de error
      if (context?.previousEntrenadores) {
        queryClient.setQueryData(entrenadoresKeys.lists(), context.previousEntrenadores);
      }

      console.error("Error eliminando entrenador:", error);
      toast.error(error.message || "Error al eliminar el entrenador", { id: `delete-entrenador-${id}` });
    },
  });
}

/**
 * Hook para cambiar el estado de un entrenador
 */
export function useToggleEntrenadorStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "Activo" | "Inactivo" | "Vacaciones" | "Pendiente" }) =>
      EntrenadoresService.toggleEntrenadorStatus(id, status),
    onMutate: async ({ id, status }) => {
      const action = status === "Activo" ? "Activando" : "Desactivando";
      toast.loading(`${action} entrenador...`, { id: `toggle-entrenador-${id}` });

      // Cancelar queries para evitar conflictos
      await queryClient.cancelQueries({ queryKey: entrenadoresKeys.lists() });
      await queryClient.cancelQueries({ queryKey: entrenadoresKeys.detail(id) });

      // Guardar snapshot de la lista
      const previousEntrenadores = queryClient.getQueryData<Entrenador[]>(entrenadoresKeys.lists());

      return { previousEntrenadores, id };
    },
    onSuccess: (response, { id, status }) => {
      // Invalidar lista para refrescar con datos del servidor
      queryClient.invalidateQueries({ queryKey: entrenadoresKeys.lists() });

      const action = status === "Activo" ? "activado" : "desactivado";
      toast.success(`Entrenador ${action} exitosamente`, { id: `toggle-entrenador-${id}` });

      console.log("📨 Respuesta del servidor:", response);
    },
    onError: (error: Error, { id }, context) => {
      // Rollback: restaurar la lista anterior
      if (context?.previousEntrenadores) {
        queryClient.setQueryData(entrenadoresKeys.lists(), context.previousEntrenadores);
      }

      console.error("Error cambiando estado del entrenador:", error);
      toast.error(error.message || "Error al cambiar el estado", { id: `toggle-entrenador-${id}` });
    },
  });
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Hook para prefetch de un entrenador (útil para hover effects)
 */
export function usePrefetchEntrenador() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: entrenadoresKeys.detail(id),
      queryFn: () => EntrenadoresService.getEntrenadorById(id),
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Hook para invalidar todas las queries de entrenadores
 */
export function useInvalidateEntrenadores() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: entrenadoresKeys.all });
  };
}
