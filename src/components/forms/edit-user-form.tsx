"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CoverImageUpload, type CoverImageValue } from "@/components/cover-image-upload";
import { CeldaEditableMultiple } from "@/components/data-table/celda-editable-multiple";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OPCIONES_ROL_EMPLEADO, parseRolesEmpleado, serializaRolesEmpleado } from "@/lib/roles-empleado";
import type { RolEmpleado } from "@/lib/roles-empleado";

// ============================================================================
// SCHEMA DE VALIDACIÓN
// ============================================================================

// Los campos que se pueden dejar en blanco llevan `.or(z.literal(""))`: en este
// formulario «vacío» significa «no lo toques» (el envío filtra las cadenas
// vacías), no «guárdalo vacío». Sin eso, el formulario NO SE PODÍA ENVIAR desde
// Empleados: la tabla nunca pasa el `username`, así que el campo salía en blanco
// y `min(3)` lo daba por inválido; el botón «Guardar cambios» dejaba el error
// bajo un campo que nadie había tocado y no guardaba nada.
const editUserFormSchema = z.object({
  user_id: z.string(),
  firstName: z.string().min(1, "El nombre es requerido").optional(),
  lastName: z.string().min(1, "El apellido es requerido").optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  username: z.string().min(3, "El username debe tener al menos 3 caracteres").optional().or(z.literal("")),
  phone_number: z.string().optional(),
  birth: z.string().optional(),
  description: z.string().optional(),
  profile_picture: z.string().url("URL inválida").optional().or(z.literal("")),
});

export type EditUserFormData = z.infer<typeof editUserFormSchema> & {
  /**
   * Roles del empleado, separados por comas. Solo viaja cuando el formulario los
   * enseña; en un alumno no existe el concepto.
   */
  staff_role?: string;
  /** Foto elegida del ordenador. Quien recibe el envío la sube y guarda su URL. */
  profile_picture_file?: File | null;
};

// ============================================================================
// TIPOS
// ============================================================================

export interface EditUserFormProps {
  userId: string;
  defaultValues?: Partial<EditUserFormData>;
  onSubmit: (data: EditUserFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  /**
   * Enseña el bloque de roles (pestaña Empleados). Apagado para alumnos, que no
   * tienen rol de staff.
   */
  mostrarRoles?: boolean;
}

// ============================================================================
// COMPONENTE
// ============================================================================

export function EditUserForm({
  userId,
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  mostrarRoles = false,
}: EditUserFormProps) {
  const form = useForm<z.infer<typeof editUserFormSchema>>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      user_id: userId,
      firstName: defaultValues?.firstName || "",
      lastName: defaultValues?.lastName || "",
      email: defaultValues?.email || "",
      username: defaultValues?.username || "",
      phone_number: defaultValues?.phone_number || "",
      birth: defaultValues?.birth || "",
      description: defaultValues?.description || "",
      profile_picture: defaultValues?.profile_picture || "",
    },
  });

  // La foto y los roles van fuera del schema de react-hook-form: una es un
  // `File` (no es texto validable) y los otros son una lista que se pinta con la
  // misma píldora que la tabla, no con un input.
  const [foto, setFoto] = useState<CoverImageValue>({ file: null, url: defaultValues?.profile_picture ?? "" });
  const [roles, setRoles] = useState<RolEmpleado[]>(parseRolesEmpleado(defaultValues?.staff_role));

  const handleSubmit = (data: z.infer<typeof editUserFormSchema>) => {
    // Filtrar campos vacíos para enviar solo lo que cambió. `user_id` se vuelve
    // a poner a mano porque identifica a quién se edita y no puede caerse aquí.
    const filteredData: EditUserFormData = {
      ...(Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== "" && value !== undefined),
      ) as Partial<EditUserFormData>),
      user_id: data.user_id,
    };

    // La foto manda el bloque de imagen, no el campo de texto: si se eligió un
    // archivo va el archivo; si se pegó (o se borró) una URL, va la URL.
    delete filteredData.profile_picture;
    if (foto.file) filteredData.profile_picture_file = foto.file;
    else if (foto.url !== (defaultValues?.profile_picture ?? "")) filteredData.profile_picture = foto.url;

    // Los roles se mandan SIEMPRE que se enseñen, incluso vacíos: quitarle a
    // alguien todos sus roles es un cambio tan válido como ponerle uno, y el
    // filtro de arriba se lo habría comido por ser cadena vacía.
    if (mostrarRoles) filteredData.staff_role = serializaRolesEmpleado(roles);

    onSubmit(filteredData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Bloque: Información personal */}
        <div className="border-border/70 bg-background space-y-5 rounded-lg border p-4">
          <p className="text-muted-foreground text-sm font-medium">Información personal</p>

          {/* Nombres */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido</FormLabel>
                  <FormControl>
                    <Input placeholder="Pérez" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Email y Username */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="usuario@example.com" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="juanperez" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Teléfono y Fecha de nacimiento */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="+34612345678" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Nacimiento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Bloque: Roles (solo empleados) */}
        {mostrarRoles && (
          <div className="border-border/70 bg-background space-y-3 rounded-lg border p-4">
            <p className="text-muted-foreground text-sm font-medium">Roles</p>
            <CeldaEditableMultiple
              valores={roles}
              opciones={OPCIONES_ROL_EMPLEADO}
              vacio="Sin rol"
              maxVisibles={6}
              soloLectura={isLoading}
              // Aquí «guardar» es apuntarlo en el formulario: lo que se manda al
              // servidor sale al pulsar «Guardar cambios», como el resto.
              onGuardar={async (nuevos) => setRoles(nuevos as RolEmpleado[])}
            />
            <p className="text-muted-foreground text-xs">
              Una misma persona puede tener varios (por ejemplo, Trainer y Nutri).
            </p>
          </div>
        )}

        {/* Bloque: Biografía / Descripción */}
        <div className="border-border/70 bg-background space-y-5 rounded-lg border p-4">
          <p className="text-muted-foreground text-sm font-medium">Sobre el usuario</p>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descripción del usuario..."
                    className="resize-none"
                    rows={3}
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Bloque: Foto de perfil — archivo del ordenador o URL */}
        <CoverImageUpload
          titulo="Foto de perfil"
          redonda
          conRecorte
          value={foto}
          onChange={setFoto}
          initialPreviewUrl={defaultValues?.profile_picture ?? null}
          disabled={isLoading}
        />

        {/* Botones de Acción */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
