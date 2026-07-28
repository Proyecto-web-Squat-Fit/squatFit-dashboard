"use client";

import { useMemo, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Lock, Search, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdvicePlans } from "@/hooks/use-advice-plans";
import {
  AdvicePlansPermissionError,
  durationLabel,
  formatAdvicePrice,
  type AdvicePlan,
} from "@/lib/services/advice-plans-service";

type StatusFilter = "todos" | "activos" | "inactivos";

function formatDate(value: string): string {
  try {
    return format(new Date(value), "d MMM yyyy", { locale: es });
  } catch {
    return value;
  }
}

/** Filtro 100% cliente: el backend no pagina ni filtra `advice-plans`. */
function filterPlans(plans: AdvicePlan[], search: string, statusFilter: StatusFilter): AdvicePlan[] {
  const byStatus = plans.filter((p) => {
    if (statusFilter === "activos") return p.is_active;
    if (statusFilter === "inactivos") return !p.is_active;
    return true;
  });
  const q = search.trim().toLowerCase();
  if (!q) return byStatus;
  return byStatus.filter((p) => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q));
}

function PlanRow({ plan }: { readonly plan: AdvicePlan }) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        {plan.name}
        {plan.description && (
          <span className="text-muted-foreground block max-w-[360px] truncate text-xs" title={plan.description}>
            {plan.description}
          </span>
        )}
      </TableCell>
      <TableCell>{formatAdvicePrice(plan.price)}</TableCell>
      <TableCell>{durationLabel(plan.duration_days)}</TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={plan.is_active ? "border-green-300 text-green-700" : "text-muted-foreground"}
        >
          {plan.is_active ? "Activo" : "Inactivo"}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-xs">{formatDate(plan.created_at)}</TableCell>
    </TableRow>
  );
}

function PlansTable({ plans, isFiltered }: { readonly plans: AdvicePlan[]; readonly isFiltered: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#EBEAF2]/60 hover:bg-[#EBEAF2]/60 dark:bg-[#363C98]/25 dark:hover:bg-[#363C98]/25">
                <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Plan</TableHead>
                <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Precio</TableHead>
                <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Duración</TableHead>
                <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Estado</TableHead>
                <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                    {isFiltered
                      ? "No hay planes de asesoría que coincidan con el filtro."
                      : "No hay planes de asesoría todavía."}
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((p) => <PlanRow key={p.id} plan={p} />)
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function PermissionErrorBanner() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
      <Lock className="size-4 shrink-0" />
      No tienes permiso para ver los planes de asesoría (el backend aún no reconoce este permiso en todos los roles). No
      es que no haya planes: es un permiso pendiente en el servidor.
    </div>
  );
}

function GenericErrorBanner({ error }: { readonly error: unknown }) {
  return (
    <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-center gap-2 rounded-lg border p-3 text-sm">
      <TriangleAlert className="size-4 shrink-0" />
      No se pudo cargar la lista de planes de asesoría: {error instanceof Error ? error.message : "Error"}
    </div>
  );
}

/**
 * PLANES DE ASESORÍA (F2, back office, nº 21). Solo lectura sobre
 * `GET admin-panel/advice-plans` (PR #52, ya en prod): planes de la tabla
 * legacy `suscription_plan` (así escrita en el backend), que completan el
 * inventario del catálogo unificado sin vivir en `products` (sin
 * stripe_price_id ni grant_type). El backend NO expone crear/editar/borrar
 * aquí a propósito — la gestión de asesorías sigue en su propio módulo — así
 * que esta pantalla es un visor, no un CRUD.
 */
export function AdvicePlansView() {
  const { data, isLoading, isError, error } = useAdvicePlans();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");

  const isPermissionError = isError && error instanceof AdvicePlansPermissionError;
  const isFiltered = search.trim() !== "" || statusFilter !== "todos";
  const visible = useMemo(() => filterPlans(data ?? [], search, statusFilter), [data, search, statusFilter]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Planes de asesoría del módulo legacy (<code>suscription_plan</code>). Solo lectura: se gestionan desde el módulo
        de Asesorías, no desde aquí.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
          <Input
            placeholder="Buscar por nombre o descripción…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="activos">Activos</SelectItem>
            <SelectItem value="inactivos">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isPermissionError && <PermissionErrorBanner />}
      {isError && !isPermissionError && <GenericErrorBanner error={error} />}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!isLoading && !isPermissionError && <PlansTable plans={visible} isFiltered={isFiltered} />}
    </div>
  );
}
