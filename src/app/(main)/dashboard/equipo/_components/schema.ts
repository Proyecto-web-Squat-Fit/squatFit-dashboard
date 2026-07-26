import { z } from "zod";

// Schema basado en la respuesta del API
export const entrenadorSchema = z.object({
  id: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profile_picture: z.string().optional(),
  description: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email(),
  user_id: z.string(),
  user_status: z.number(), // 0 = Inactivo, 1 = Activo
  staff_role: z.string().nullable().optional(), // Rol formal (Nutri/Trainer/Psicóloga/Soporte/Ventas/Admin)
});

export type Entrenador = z.infer<typeof entrenadorSchema>;

// Tipo extendido para la UI con campos computados
export type EntrenadorUI = Omit<Entrenador, "firstName" | "lastName"> & {
  firstName: string;
  lastName: string;
  status: "Activo" | "Inactivo";
  fullName: string;
  avatar?: string;
};
