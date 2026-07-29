"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  User2,
  ShoppingBag,
  Mail,
  AtSign,
  Cake,
  ShieldCheck,
  PackagePlus,
  GraduationCap,
  BookOpen,
  Package,
  Library,
  CalendarClock,
  Infinity as InfinityIcon,
  Contact,
  ExternalLink,
  Target,
  Flame,
  Activity,
  EyeOff,
} from "lucide-react";

import { BrandTabs } from "@/components/brand-tabs";
import { GrantProductDialog } from "@/components/modals/grant-product-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientProfile, type ClientAccess } from "@/hooks/use-client-profile";
import { useStaffRole } from "@/hooks/use-staff-role";
import { avatarSrc } from "@/lib/avatar";
import { canGrantProducts, visibleFichaSections } from "@/lib/ficha-visibility";

import { ClientProgressSection } from "./client-progress-section";
import { StaffNotesSection } from "./staff-notes-section";

/** Píldora de caducidad para accesos de curso / suscripciones. */
function ExpiryBadge({ end }: { end: string | null }) {
  if (!end) {
    return (
      <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
        <InfinityIcon className="size-3" /> Permanente
      </Badge>
    );
  }
  const date = new Date(end);
  const expired = date.getTime() < Date.now();
  const label = date.toLocaleDateString("es-ES");
  return (
    <Badge
      className={
        expired
          ? "gap-1 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200"
          : "gap-1 bg-[#EBEAF2] text-[#363C98] dark:bg-[#363C98]/30 dark:text-[#b9bce8]"
      }
    >
      <CalendarClock className="size-3" />
      {expired ? `Caducó ${label}` : `Caduca ${label}`}
    </Badge>
  );
}

// Las pestañas se derivan de la matriz de visibilidad por rol (ficha-visibility.ts).

function AccessIcon({ type }: { type: ClientAccess["type"] }) {
  if (type === "Curso") return <GraduationCap className="size-4" />;
  if (type === "Libro") return <BookOpen className="size-4" />;
  return <Package className="size-4" />;
}

function DataRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 last:border-0">
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        {icon}
        {label}
      </span>
      <span className="text-right text-sm font-medium">
        {value ?? <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}

function BackendPending({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed p-4 text-sm">
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}

interface ClientProfileViewProps {
  userId: string;
}

export function ClientProfileView({ userId }: ClientProfileViewProps) {
  const router = useRouter();
  const [tab, setTab] = useState("datos");
  const [grantOpen, setGrantOpen] = useState(false);
  const { data, isLoading, error } = useClientProfile(userId);

  // Matriz de visibilidad por rol (Doc 0 1.5–1.6): cada rol de staff ve solo
  // sus secciones. Rol desconocido → solo «datos».
  const role = useStaffRole();
  const sections = useMemo(() => visibleFichaSections(role), [role]);
  const tabs = useMemo(
    () =>
      sections.map(({ id, label, icon: Icon }) => ({
        id,
        label,
        icon: <Icon className="size-4" />,
      })),
    [sections],
  );
  const canGrant = canGrantProducts(role);
  const can = (id: string) => sections.some((s) => s.id === id);

  // Si el rol no puede ver la pestaña activa, volver a «datos».
  useEffect(() => {
    if (!can(tab)) setTab("datos");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, tab]);

  const user = data?.user;
  const detail = data?.userDetail;
  const fullName = user ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Cliente";
  const initials =
    user && user.firstName ? `${user.firstName.charAt(0)}${user.lastName?.charAt(0) ?? ""}`.toUpperCase() : "?";

  return (
    <div className="@container/main flex flex-col gap-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Volver">
          <ArrowLeft className="size-5" />
        </Button>
        {/* La ficha SÍ trae `gender` (el listado de alumnos no), así que aquí
            se puede enseñar el avatar que le toca en vez de las iniciales. Si
            el sexo está vacío —que es lo más común— sale el neutro, y si la
            imagen no cargara siguen quedando las iniciales debajo. */}
        <Avatar className="size-12">
          <AvatarImage src={avatarSrc(null, detail?.gender)} alt={fullName} />
          <AvatarFallback className="bg-blue-100 font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          {isLoading ? (
            <Skeleton className="h-6 w-40" />
          ) : (
            <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
          )}
          <p className="text-muted-foreground text-sm">{user?.email ?? (isLoading ? "" : "Usuario")}</p>
        </div>
        {canGrant && (
          <Button className="ml-auto gap-2" onClick={() => setGrantOpen(true)}>
            <PackagePlus className="size-4" />
            Añadir producto
          </Button>
        )}
      </div>

      <GrantProductDialog open={grantOpen} onOpenChange={setGrantOpen} userId={userId} userName={fullName} />

      {error && (
        <Card>
          <CardContent className="text-destructive py-6 text-sm">
            No se pudieron cargar los datos del cliente: {error.message}
          </CardContent>
        </Card>
      )}

      <BrandTabs tabs={tabs} active={tab} onChange={setTab} />

      {role && role !== "admin" && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <EyeOff className="size-3.5" />
          Vista limitada por rol «{role}»: se ocultan las secciones que no corresponden (matriz Doc 0, 1.5–1.6).
        </p>
      )}

      {/* Datos de usuario */}
      {tab === "datos" && (
        <Card>
          <CardHeader>
            <CardTitle>Datos de usuario</CardTitle>
            <CardDescription>Información de la cuenta registrada.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col">
                <DataRow icon={<User2 className="size-4" />} label="Nombre" value={fullName} />
                <DataRow icon={<Mail className="size-4" />} label="Email" value={user?.email} />
                <DataRow
                  icon={<AtSign className="size-4" />}
                  label="Usuario"
                  value={user ? `@${user.username}` : undefined}
                />
                <DataRow
                  icon={<Cake className="size-4" />}
                  label="Fecha de nacimiento"
                  value={user?.birth ? new Date(user.birth).toLocaleDateString("es-ES") : undefined}
                />
                <DataRow
                  icon={<ShieldCheck className="size-4" />}
                  label="Rol"
                  value={user?.role ? <Badge variant="outline">{user.role}</Badge> : undefined}
                />
                <DataRow
                  label="Estado"
                  value={
                    user?.status ? (
                      <Badge
                        className={
                          user.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        }
                      >
                        {user.status === "active" ? "Activo" : "Inactivo"}
                      </Badge>
                    ) : undefined
                  }
                />
                {/* Lead de origen: enlaza el lead que se convirtió en este cliente. */}
                {data?.convertedLead && (
                  <DataRow
                    icon={<Contact className="size-4" />}
                    label="Lead de origen"
                    value={
                      <Button asChild variant="outline" size="sm" className="gap-1.5">
                        <Link
                          href={`/dashboard/leads?search=${encodeURIComponent(
                            data.convertedLead.email ?? data.convertedLead.name ?? "",
                          )}`}
                        >
                          {data.convertedLead.name ?? "Ver lead"}
                          <ExternalLink className="size-3.5" />
                        </Link>
                      </Button>
                    }
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Accesos concedidos */}
      {tab === "accesos" && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Accesos concedidos</CardTitle>
              <CardDescription>Cursos, libros y packs a los que el cliente tiene acceso.</CardDescription>
            </div>
            {canGrant && (
              <Button size="sm" variant="outline" className="gap-2" onClick={() => setGrantOpen(true)}>
                <PackagePlus className="size-4" />
                Añadir
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Cursos con su CADUCIDAD (expires_at) — fuente autoritativa (Fase 14.4). */}
            {data && data.courses.length > 0 && (
              <div className="space-y-2">
                <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                  <GraduationCap className="size-3.5" /> Cursos y caducidad
                </p>
                <div className="divide-y rounded-md border">
                  {data.courses.map((c) => (
                    <div key={c.course_id} className="flex items-center justify-between gap-3 p-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-muted text-muted-foreground rounded-md p-2">
                          <GraduationCap className="size-4" />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{c.course_title ?? "Curso"}</span>
                          {c.purchased_at && (
                            <span className="text-muted-foreground text-xs">
                              Desde {new Date(c.purchased_at).toLocaleDateString("es-ES")}
                              {String(c.purchase_from).toUpperCase() === "ADMIN_GRANT" && " · concedido por staff"}
                            </span>
                          )}
                        </div>
                      </div>
                      <ExpiryBadge end={c.expires_at} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suscripciones de biblioteca digital con su FIN (end_date). */}
            {data && data.librarySubscriptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                  <Library className="size-3.5" /> Biblioteca digital
                </p>
                <div className="divide-y rounded-md border">
                  {data.librarySubscriptions.map((s) => {
                    const active = String(s.status).toLowerCase() === "active";
                    return (
                      <div key={s.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="flex items-center gap-3">
                          <span className="bg-muted text-muted-foreground rounded-md p-2">
                            <Library className="size-4" />
                          </span>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium capitalize">
                              {s.subscription_type ?? "Biblioteca"}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              <Badge
                                variant="outline"
                                className={active ? "border-green-300 text-green-700" : "text-muted-foreground"}
                              >
                                {active ? "Activa" : (s.status ?? "inactiva")}
                              </Badge>
                            </span>
                          </div>
                        </div>
                        <ExpiryBadge end={s.end_date} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Accesos derivados de las ventas (fallback / complemento). */}
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : data && data.accesses.length > 0 ? (
              <div className="space-y-2">
                {(data.courses.length > 0 || data.librarySubscriptions.length > 0) && (
                  <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
                    <ShoppingBag className="size-3.5" /> Otros accesos (compras)
                  </p>
                )}
                <div className="divide-y rounded-md border">
                  {data.accesses.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-3 p-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-muted text-muted-foreground rounded-md p-2">
                          <AccessIcon type={a.type} />
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{a.title}</span>
                          <span className="text-muted-foreground text-xs">
                            {a.type} · {new Date(a.date).toLocaleDateString("es-ES")}
                          </span>
                        </div>
                      </div>
                      <Badge
                        className={
                          a.origin === "grant"
                            ? "bg-[#FFEDE0] text-[#FF690B] dark:bg-[#FF690B]/20 dark:text-[#ffa266]"
                            : "bg-[#EBEAF2] text-[#363C98] dark:bg-[#363C98]/30 dark:text-[#b9bce8]"
                        }
                      >
                        {a.origin === "grant" ? "Concedido por staff" : "Comprado"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : data && data.courses.length === 0 && data.librarySubscriptions.length === 0 ? (
              <p className="text-muted-foreground text-sm">Este cliente no tiene accesos registrados todavía.</p>
            ) : null}
            {data?.purchasesByNameOnly && (
              <p className="text-muted-foreground text-xs">
                Nota: los accesos se derivan de las ventas filtradas por nombre (el backend aún no filtra por{" "}
                <code>user_id</code>). En cuanto exista <code>sales?user_id</code> o un endpoint de accesos por usuario,
                el listado será exacto.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Compras */}
      {tab === "compras" && (
        <Card>
          <CardHeader>
            <CardTitle>Compras</CardTitle>
            <CardDescription>Productos adquiridos por el cliente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : data && data.purchases.length > 0 ? (
              <div className="divide-y rounded-md border">
                {data.purchases.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{s.title}</span>
                      <span className="text-muted-foreground text-xs">
                        {s.type} · {new Date(s.date).toLocaleDateString("es-ES")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {s.amount_value} {s.amount_currency}
                      </span>
                      <Badge variant="outline">{s.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Sin compras registradas para este cliente.</p>
            )}
            {data?.purchasesByNameOnly && (
              <p className="text-muted-foreground text-xs">
                Nota: el backend aún no filtra ventas por usuario; el listado se ha filtrado por nombre y puede ser
                aproximado. Pendiente de un endpoint de ventas por <code>user_id</code>.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Medidas y salud (onboarding) */}
      {tab === "salud" && (
        <Card>
          <CardHeader>
            <CardTitle>Medidas y datos de salud</CardTitle>
            <CardDescription>Datos del onboarding (peso, altura, objetivo, actividad…).</CardDescription>
          </CardHeader>
          <CardContent>
            {detail ? (
              <div className="flex flex-col">
                <DataRow label="Peso" value={detail.weight != null ? `${detail.weight} kg` : undefined} />
                <DataRow label="Altura" value={detail.height != null ? `${detail.height} cm` : undefined} />
                <DataRow label="Género" value={detail.gender ?? undefined} />
                <DataRow
                  label="Objetivo de kcal"
                  value={detail.config_kcal_goal != null ? `${detail.config_kcal_goal} kcal` : undefined}
                />
                <DataRow label="Teléfono" value={detail.phone_number ?? undefined} />
                <DataRow label="Plataforma" value={detail.platform ?? undefined} />
              </div>
            ) : (
              <BackendPending>
                El admin-panel todavía no expone un endpoint <code>GET</code> de detalle de usuario que devuelva las
                medidas del onboarding (peso, altura, género, objetivo, kcal, nivel de actividad). El hook ya llama a{" "}
                <code>GET /admin-panel/users/:id</code> tras la detección <code>USER_DETAIL_API_READY</code>: en cuanto
                el backend lo publique, esta sección se rellena sola.
              </BackendPending>
            )}
          </CardContent>
        </Card>
      )}

      {/* Objetivos */}
      {tab === "objetivos" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-5" /> Objetivos
            </CardTitle>
            <CardDescription>Objetivo de entrenamiento, actividad y meta calórica del cliente.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : detail ? (
              <div className="flex flex-col">
                <DataRow
                  icon={<Flame className="size-4" />}
                  label="Objetivo de kcal"
                  value={detail.config_kcal_goal != null ? `${detail.config_kcal_goal} kcal/día` : undefined}
                />
                <DataRow
                  icon={<Target className="size-4" />}
                  label="Objetivo de entrenamiento"
                  value={detail.training_goal_id ?? undefined}
                />
                <DataRow
                  icon={<Activity className="size-4" />}
                  label="Actividad diaria"
                  value={detail.daily_activity_id ?? undefined}
                />
                <DataRow label="Cardio semanal" value={detail.weekly_cardio_frequency_id ?? undefined} />
                <DataRow label="Pasos al día" value={detail.steps_peer_day_id ?? undefined} />
                <DataRow label="Fuerza" value={detail.strength_training_id ?? undefined} />
                <p className="text-muted-foreground pt-3 text-xs">
                  Los campos de objetivo llegan como identificadores de catálogo; falta que el admin-panel exponga los
                  catálogos (training_goals, daily_activities…) para mostrar las etiquetas legibles (ver
                  INFORME-FASE-17).
                </p>
              </div>
            ) : (
              <BackendPending>
                Los objetivos salen del detalle de usuario (<code>GET /admin-panel/users/:id</code>, campos{" "}
                <code>config_kcal_goal</code>, <code>training_goal_id</code>, <code>daily_activity_id</code>…). En
                cuanto el backend publique ese GET (detección <code>USER_DETAIL_API_READY</code>), esta sección se
                rellena sola.
              </BackendPending>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progreso — serie real de la Tabla progreso clientes (F3 nº 138). */}
      {tab === "progreso" && <ClientProgressSection userId={userId} />}

      {/* Notas de staff */}
      {tab === "notas" && <StaffNotesSection userId={userId} authorRole={role} />}

      {/* Formularios */}
      {tab === "formularios" && (
        <Card>
          <CardHeader>
            <CardTitle>Respuestas de formularios</CardTitle>
            <CardDescription>Evaluación inicial, seguimiento y demás cuestionarios.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : data && data.forms.length > 0 ? (
              data.forms.map(({ formType, answer }) => (
                <div key={formType.id} className="rounded-md border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium">{formType.name}</span>
                    <Badge variant={answer ? "default" : "secondary"}>{answer ? "Respondido" : "Sin respuesta"}</Badge>
                  </div>
                  {answer ? (
                    <dl className="grid gap-1.5">
                      {Object.entries(answer.answers ?? {}).map(([q, a]) => (
                        <div key={q} className="grid grid-cols-[1fr_1fr] gap-2 text-sm">
                          <dt className="text-muted-foreground">{q}</dt>
                          <dd className="font-medium">{String(a)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-muted-foreground text-sm">El cliente no ha completado este formulario.</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No hay tipos de formulario disponibles.</p>
            )}
            <p className="text-muted-foreground text-xs">
              Los tipos disponibles hoy son los de asesoramiento (Nutricional, Deportivo, Completo, Revisión Mensual).
              Prellamada y solicitudes de empleo aún no existen como formularios en el backend (ver informe).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
