"use client";

import { useState, useEffect } from "react";

import { toast } from "sonner";

import { EditUserForm, EditUserFormData } from "@/components/forms/edit-user-form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUpdateUser } from "@/hooks/use-update-user";
import { UsersService } from "@/lib/services/users-service";

// ============================================================================
// TIPOS
// ============================================================================

export interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userType?: "coach" | "alumno" | "usuario";
  defaultValues?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    username?: string;
    phone_number?: string;
    birth?: string;
    description?: string;
    profile_picture?: string;
    /** Roles del empleado separados por comas (solo `userType: "coach"`). */
    staff_role?: string;
  };
}

// ============================================================================
// COMPONENTE
// ============================================================================

/**
 * Modal reutilizable para editar información de usuarios
 * Puede usarse para coaches, alumnos o cualquier tipo de usuario
 */
export function EditUserModal({ open, onOpenChange, userId, userType = "usuario", defaultValues }: EditUserModalProps) {
  const updateUserMutation = useUpdateUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resetear estado cuando se cierra el modal
  useEffect(() => {
    if (!open) {
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async (data: EditUserFormData) => {
    setIsSubmitting(true);

    try {
      const { profile_picture_file: archivo, ...campos } = data;

      // Si se eligió una foto del ordenador, primero sube a GCS (el endpoint de
      // foto de perfil del backend) y luego guarda el resto con la URL que
      // devuelve. En este orden porque si la subida falla, no queremos haber
      // guardado ya el resto: se avisa y no se toca nada.
      if (archivo) {
        try {
          const subida = await UsersService.subirFotoPerfil(data.user_id, archivo);
          if (subida.profile_picture) campos.profile_picture = subida.profile_picture;
        } catch (error) {
          // Este fallo no pasa por el hook, así que hay que avisarlo aquí.
          console.error("Error subiendo la foto:", error);
          toast.error(error instanceof Error ? error.message : "No se pudo subir la foto");
          return;
        }
      }

      await updateUserMutation.mutateAsync(campos);

      // Cerrar modal después de actualizar exitosamente
      onOpenChange(false);
    } catch (error) {
      // El error ya se maneja en el hook
      console.error("Error en modal:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  // «coach» es el nombre que usa el backend; en pantalla son EMPLEADOS desde que
  // Equipo pasó a ser una pestaña de Usuarios.
  const getTitleByUserType = () => {
    switch (userType) {
      case "coach":
        return "Editar Empleado";
      case "alumno":
        return "Editar Alumno";
      default:
        return "Editar Usuario";
    }
  };

  const getDescriptionByUserType = () => {
    switch (userType) {
      case "coach":
        return "Actualiza la información del empleado.";
      case "alumno":
        return "Actualiza la información del alumno.";
      default:
        return "Actualiza la información del usuario.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitleByUserType()}</DialogTitle>
          <DialogDescription>{getDescriptionByUserType()}</DialogDescription>
        </DialogHeader>

        <EditUserForm
          userId={userId}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting}
          mostrarRoles={userType === "coach"}
        />
      </DialogContent>
    </Dialog>
  );
}
