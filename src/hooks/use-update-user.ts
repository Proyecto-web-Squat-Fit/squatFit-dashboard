import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { UsersService, UpdateUserDto } from "@/lib/services/users-service";

// ============================================================================
// MUTATION - ACTUALIZACIÓN DE USUARIOS
// ============================================================================

/**
 * Hook para actualizar información de usuarios (coaches, alumnos, etc.)
 * Reutilizable para cualquier tipo de usuario en el sistema
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserDto) => UsersService.updateUser(data),
    onMutate: async (data) => {
      toast.loading("Actualizando usuario...", { id: `update-user-${data.user_id}` });

      return { userId: data.user_id };
    },
    onSuccess: (response, variables, context) => {
      // Invalidar todas las queries relacionadas con usuarios
      // Esto asegura que las listas se actualicen automáticamente
      queryClient.invalidateQueries({ queryKey: ["entrenadores"] });
      queryClient.invalidateQueries({ queryKey: ["alumnos"] });
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["usuarios-directory"] });

      toast.success("Usuario actualizado exitosamente", {
        id: `update-user-${context?.userId}`,
      });

      console.log("✅ Usuario actualizado:", response);
    },
    onError: (error: Error, variables, context) => {
      console.error("❌ Error actualizando usuario:", error);

      toast.error(error.message || "Error al actualizar el usuario", {
        id: `update-user-${context?.userId}`,
      });
    },
  });
}
