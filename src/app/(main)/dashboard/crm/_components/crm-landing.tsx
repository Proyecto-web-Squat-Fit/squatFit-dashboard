"use client";

import { useMemo } from "react";

import Link from "next/link";

import { ArrowRight, BadgePercent, Contact, TicketPercent, UserPlus, Users2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeads } from "@/hooks/use-leads";
import { LEAD_SOURCE_LABEL, type Lead } from "@/lib/services/leads-service";

/**
 * LANDING DE CRM (reestructura 27-jul, spec Hamlet): CRM deja de apuntar
 * directo a Leads y pasa a tener su propia página, igual que Nutri. Sustituye
 * las tarjetas de plantilla del template original (nunca enlazadas desde el
 * menú, con datos inventados) por un resumen real de leads + acceso a las 3
 * subsecciones.
 */

const CERRADOS: ReadonlySet<Lead["state"]> = new Set(["Ganado", "Perdido"]);

const SECCIONES = [
  {
    id: "leads",
    title: "Leads",
    description: "Pipeline comercial y repesca de leads.",
    href: "/dashboard/leads",
    icon: Contact,
  },
  {
    id: "downsell",
    title: "Downsell",
    description: "Generador de copy y enlaces para la conversación de downsell.",
    href: "/dashboard/downsell",
    icon: BadgePercent,
  },
  {
    id: "cupones",
    title: "Cupones",
    description: "Alta y edición manual de cupones de descuento.",
    href: "/dashboard/cupones",
    icon: TicketPercent,
  },
] as const;

function fechaCorta(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export function CrmLanding() {
  const { data: leads, isLoading, isError } = useLeads();

  const nuevos = useMemo(() => (leads ?? []).filter((l) => l.state === "Nuevo").length, [leads]);
  const abiertos = useMemo(() => (leads ?? []).filter((l) => !CERRADOS.has(l.state)).length, [leads]);

  const recientes = useMemo(
    () =>
      [...(leads ?? [])]
        .sort((a, b) => (b.intake_date || b.created_at).localeCompare(a.intake_date || a.created_at))
        .slice(0, 5),
    [leads],
  );

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">CRM</h1>
        <p className="text-muted-foreground text-sm">Leads, downsell y cupones en un solo sitio.</p>
      </div>

      {/* Resumen real de leads */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <UserPlus className="size-8 shrink-0 text-[#FF690B]" />
            <div>
              <p className="text-2xl font-bold">{isLoading ? "—" : nuevos}</p>
              <p className="text-muted-foreground text-sm">Leads nuevos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Users2 className="size-8 shrink-0 text-[#3932C0] dark:text-indigo-300" />
            <div>
              <p className="text-2xl font-bold">{isLoading ? "—" : abiertos}</p>
              <p className="text-muted-foreground text-sm">Leads abiertos (sin cerrar)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tarjetas de acceso a las secciones */}
      <div className="grid gap-4 md:grid-cols-3">
        {SECCIONES.map((s) => (
          <Card key={s.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-2">
                <s.icon className="size-5 text-[#FF690B]" />
                <CardTitle className="text-base">{s.title}</CardTitle>
              </div>
              <CardDescription>{s.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto flex items-center justify-end">
              <Button asChild size="sm" variant="outline">
                <Link href={s.href}>
                  Abrir
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actividad reciente (leads reales del servicio) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads más recientes</CardTitle>
          <CardDescription>Últimos leads por fecha de ingreso, con enlace a su búsqueda en Leads.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
          {!isLoading && isError && (
            <p className="text-muted-foreground text-sm">
              No se pudo cargar la actividad reciente (backend no disponible).
            </p>
          )}
          {!isLoading && !isError && recientes.length === 0 && (
            <p className="text-muted-foreground text-sm">Aún no hay leads registrados.</p>
          )}
          {recientes.map((l) => (
            <Link
              key={l.id}
              href={`/dashboard/leads?search=${encodeURIComponent(l.name)}`}
              className="hover:bg-accent flex items-center justify-between gap-3 rounded-md px-2 py-2"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Contact className="text-muted-foreground size-4 shrink-0" />
                <span className="truncate text-sm font-medium">{l.name}</span>
              </span>
              <span className="text-muted-foreground flex shrink-0 items-center gap-3 text-xs">
                <Badge variant="outline" className="font-normal">
                  {l.state}
                </Badge>
                <span className="hidden sm:inline">{LEAD_SOURCE_LABEL[l.source]}</span>
                <span>{fechaCorta(l.intake_date || l.created_at)}</span>
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
