"use client";

import { useEffect, useMemo, useState } from "react";

import { KeyRound, LogOut, Shield, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

import { CoverImageUpload, type CoverImageValue } from "@/components/cover-image-upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { getAuthToken } from "@/lib/auth/auth-utils";
import { decodeToken } from "@/lib/auth/jwt-utils";
import { avatarSrc } from "@/lib/avatar";
import { rolesDeEmpleado } from "@/lib/roles-empleado";
import { UsersService } from "@/lib/services/users-service";
import { getInitials } from "@/lib/utils";

/**
 * PERFIL — "la persona", frente a Ajustes, que es "la casa" (el criterio lo fijó
 * la reestructura del 27-jul y está escrito en ajustes-view.tsx).
 *
 * Desde el 3-ago es EDITABLE: cada empleado cambia sus propios datos personales
 * —nombre, apellidos, email, teléfono, fecha de nacimiento, descripción y foto—
 * sin tener que pedírselo a un administrador, que era lo que ponía aquí antes.
 *
 * LO QUE NO SE PUEDE TOCAR DESDE AQUÍ es el rol y los permisos: salen en la
 * tarjeta de la derecha, de solo lectura, y se cambian en Usuarios → Empleados,
 * que es de administración. Que cada cual se arregle su teléfono es cómodo; que
 * cada cual se ponga «Admin» no.
 *
 * Dos endpoints, porque el backend no tiene uno solo que haga las dos cosas:
 * los campos de texto van por `PUT /admin-panel/users/edit` (es el único que
 * acepta el email) y la foto por `PUT /user/update` en multipart, que es la
 * subida a GCS que ya existía para las fotos de perfil. Ninguno de los dos
 * acepta el rol de sistema, y al de la foto la validación del backend ni
 * siquiera le deja colar `staff_role`.
 */

/** Etiqueta legible para el rol, que en el token viene en minúsculas y en inglés. */
const ROLES: Record<string, string> = {
  admin: "Administrador",
  adviser: "Asesor",
  support: "Soporte",
  support_agent: "Soporte",
  trainer: "Entrenador",
  nutritionist: "Nutricionista",
  dietitian: "Nutricionista",
  psychologist: "Psicólogo",
  sales: "Ventas",
};

interface Campos {
  firstName: string;
  lastName: string;
  email: string;
  phone_number: string;
  birth: string;
  description: string;
}

const VACIO: Campos = { firstName: "", lastName: "", email: "", phone_number: "", birth: "", description: "" };

/** `2026-08-03T00:00:00.000Z` → `2026-08-03`, que es lo que espera <input type="date">. */
const soloFecha = (valor?: string | null) => (valor ? valor.slice(0, 10) : "");

export function PerfilView() {
  const { user, loading, logout } = useAuth();

  // El id propio no viaja en /api/auth/me (a propósito: ese endpoint deja fuera
  // `sub`), así que se saca del token, que es de donde salió la sesión.
  const userId = useMemo(() => {
    const token = getAuthToken();
    return token ? (decodeToken(token)?.sub ?? null) : null;
  }, []);

  const [campos, setCampos] = useState<Campos>(VACIO);
  const [originales, setOriginales] = useState<Campos>(VACIO);
  const [foto, setFoto] = useState<CoverImageValue>({ file: null, url: "" });
  const [fotoGuardada, setFotoGuardada] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Los datos completos (teléfono, nacimiento, descripción, foto) no están en el
  // token: hay que pedirlos.
  useEffect(() => {
    let vigente = true;
    UsersService.getMiPerfil()
      .then((yo) => {
        if (!vigente) return;
        const valores: Campos = {
          firstName: yo.firstName ?? "",
          lastName: yo.lastName ?? "",
          email: yo.email ?? "",
          phone_number: yo.phone_number ?? "",
          birth: soloFecha(yo.birth),
          description: yo.description ?? "",
        };
        setCampos(valores);
        setOriginales(valores);
        setFoto({ file: null, url: yo.profile_picture ?? "" });
        setFotoGuardada(yo.profile_picture ?? null);
        setStaffRole((yo as { staff_role?: string | null }).staff_role ?? null);
      })
      .catch((error) => {
        console.error("Error cargando el perfil:", error);
        toast.error("No se pudieron cargar tus datos", {
          description: error instanceof Error ? error.message : undefined,
        });
      })
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, []);

  if (loading || cargando) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          No hay sesión iniciada.{" "}
          <a href="/auth/v1/login" className="text-primary font-medium underline-offset-4 hover:underline">
            Entrar
          </a>
        </CardContent>
      </Card>
    );
  }

  // El token no siempre trae nombre (los emitidos antes de julio no lo tienen),
  // así que el email es la última red: nunca se enseña una cabecera vacía.
  const nombre = [campos.firstName, campos.lastName].filter(Boolean).join(" ").trim();
  const titulo = nombre || user.email;
  const rol = ROLES[user.role.toLowerCase()] ?? user.role;
  const rolesStaff = rolesDeEmpleado({ staff_role: staffRole, description: campos.description });

  const cambiado =
    (Object.keys(campos) as (keyof Campos)[]).some((clave) => campos[clave] !== originales[clave]) ||
    !!foto.file ||
    foto.url !== (fotoGuardada ?? "");

  const guardar = async () => {
    if (!userId) {
      toast.error("No se pudo identificar tu usuario. Vuelve a entrar.");
      return;
    }
    if (!campos.firstName.trim()) {
      toast.error("El nombre no puede quedar vacío");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(campos.email)) {
      toast.error("El email no es válido");
      return;
    }

    setGuardando(true);
    try {
      // 1) La foto, si se ha elegido una del ordenador. Primero, porque si esto
      //    falla no queremos haber guardado ya el resto.
      let urlFoto = foto.url;
      if (foto.file) {
        const subida = await UsersService.subirFotoPerfil(userId, foto.file);
        urlFoto = subida.profile_picture ?? "";
      }

      // 2) El resto. Se manda solo lo que ha cambiado; `birth` viaja en el
      //    formato ISO que valida el backend (@IsDateString).
      const cambios: Record<string, string> = {};
      (Object.keys(campos) as (keyof Campos)[]).forEach((clave) => {
        if (campos[clave] !== originales[clave]) cambios[clave] = campos[clave].trim();
      });
      // Una fecha vacía no se puede mandar: el backend valida `birth` como fecha
      // ISO y una cadena vacía sería un 400. Borrar la fecha que ya había no se
      // puede desde aquí, así que ni se intenta.
      if (cambios.birth === "") delete cambios.birth;
      if (urlFoto !== (fotoGuardada ?? "")) cambios.profile_picture = urlFoto;

      if (Object.keys(cambios).length) {
        await UsersService.updateUser({ user_id: userId, ...cambios });
      }

      const cambioElNombre = campos.firstName !== originales.firstName || campos.lastName !== originales.lastName;
      setOriginales({ ...campos });
      setFoto({ file: null, url: urlFoto });
      setFotoGuardada(urlFoto || null);
      toast.success("Datos guardados", {
        // El nombre del menú sale del propio token de sesión, que se emitió al
        // entrar y no se reescribe: decirlo es mejor que dejar a alguien
        // pensando que el cambio no se ha guardado.
        description: cambioElNombre ? "En el menú seguirá el nombre anterior hasta que vuelvas a entrar." : undefined,
      });
    } catch (error) {
      console.error("Error guardando el perfil:", error);
      toast.error("No se pudieron guardar los cambios", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  };

  const deshacer = () => {
    setCampos(originales);
    setFoto({ file: null, url: fotoGuardada ?? "" });
  };

  const cerrarSesion = async () => {
    try {
      await logout();
      toast.success("Sesión cerrada");
    } catch {
      toast.error("No se pudo cerrar la sesión");
    }
  };

  const campo = (clave: keyof Campos) => ({
    value: campos[clave],
    disabled: guardando,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setCampos((previos) => ({ ...previos, [clave]: e.target.value })),
  });

  return (
    <div className="space-y-6">
      {/* Cabecera: avatar grande + quién eres */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:text-left">
          <Avatar className="size-20 shrink-0">
            <AvatarImage src={avatarSrc(fotoGuardada, null)} alt={titulo} />
            <AvatarFallback className="text-lg">{getInitials(titulo)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold">{titulo}</h2>
            <p className="text-muted-foreground mt-0.5 truncate text-sm">{campos.email || user.email}</p>
            <Badge variant="secondary" className="mt-2">
              {rol}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Datos personales — editables por su dueño */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserIcon className="text-primary size-5" />
              Datos personales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-0">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="perfil-nombre">Nombre</Label>
                <Input id="perfil-nombre" placeholder="Tu nombre" {...campo("firstName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perfil-apellidos">Apellidos</Label>
                <Input id="perfil-apellidos" placeholder="Tus apellidos" {...campo("lastName")} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="perfil-email">Email</Label>
                <Input id="perfil-email" type="email" placeholder="tu@squadfit.es" {...campo("email")} />
                <p className="text-muted-foreground text-xs">Es también tu usuario para entrar al panel.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="perfil-telefono">Teléfono</Label>
                <Input id="perfil-telefono" placeholder="+34612345678" {...campo("phone_number")} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="perfil-nacimiento">Fecha de nacimiento</Label>
                <Input id="perfil-nacimiento" type="date" {...campo("birth")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="perfil-descripcion">Descripción</Label>
              <Textarea
                id="perfil-descripcion"
                rows={3}
                className="resize-none"
                placeholder="Cómo te presentas al equipo y a los clientes"
                {...campo("description")}
              />
            </div>

            <CoverImageUpload
              titulo="Foto de perfil"
              redonda
              value={foto}
              onChange={setFoto}
              initialPreviewUrl={fotoGuardada}
              disabled={guardando}
            />

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={deshacer} disabled={guardando || !cambiado}>
                Deshacer
              </Button>
              <Button onClick={guardar} disabled={guardando || !cambiado}>
                {guardando ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Rol y permisos — de solo lectura a propósito */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="text-primary size-5" />
                Rol y permisos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div>
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Acceso al panel</p>
                <p className="mt-1 text-sm font-medium">{rol}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Roles de equipo</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {rolesStaff.length ? (
                    rolesStaff.map((r) => (
                      <Badge key={r} variant="outline" className="sqf-badge-indigo">
                        {r}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm italic">Sin rol asignado</span>
                  )}
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Tu rol y tus permisos no se cambian desde aquí: los gestiona un administrador en Usuarios → Empleados.
              </p>
            </CardContent>
          </Card>

          {/* Cuenta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="text-primary size-5" />
                Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              <button
                type="button"
                onClick={() =>
                  toast.info("Escríbele a un administrador para que te la cambie desde Usuarios.", {
                    description: "El panel todavía no deja cambiarte la contraseña tú mismo.",
                  })
                }
                className="hover:bg-muted flex w-full cursor-pointer items-center gap-2.5 rounded-md p-3 text-left text-sm font-medium transition-colors"
              >
                <KeyRound className="text-muted-foreground size-4" />
                Cambiar contraseña
              </button>
              <Separator />
              <button
                type="button"
                onClick={cerrarSesion}
                className="text-destructive hover:bg-destructive/10 flex w-full cursor-pointer items-center gap-2.5 rounded-md p-3 text-left text-sm font-medium transition-colors"
              >
                <LogOut className="size-4" />
                Cerrar sesión
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
