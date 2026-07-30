"use client";

import { useEffect, useMemo, useState } from "react";

import { LayoutList, KanbanSquare, RefreshCcw, Search, Tag, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { BrandTabs } from "@/components/brand-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeads, useUpdateLead } from "@/hooks/use-leads";
import {
  LEADS_API_READY,
  LEAD_SOURCES,
  LEAD_SOURCE_LABEL,
  LEAD_STATES,
  LOST_REASON_TO_OBJECTION,
  type Lead,
  type LeadLostReason,
  type LeadObjection,
  type LeadSource,
  type LeadState,
  type UpdateLeadInput,
} from "@/lib/services/leads-service";
import { cn } from "@/lib/utils";

import { CreateLeadDialog } from "./create-lead-dialog";
import { ImportCsvDialog } from "./import-csv-dialog";
import { LeadPanel } from "./lead-panel";
import { LeadsKanban } from "./leads-kanban";
import { LeadsRepesca } from "./leads-repesca";
import { LeadsTable } from "./leads-table";
import { LostReasonDialog } from "./lost-reason-dialog";
import { MyTasksPanel } from "./my-tasks-panel";

/** Debounce local: evita disparar un GET (limit=200) en cada tecla. */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

const VIEW_TABS = [
  { id: "tabla", label: "Tabla", icon: <LayoutList className="size-4" /> },
  { id: "pipeline", label: "Pipeline comercial", icon: <KanbanSquare className="size-4" /> },
  { id: "repesca", label: "Repesca", icon: <RefreshCcw className="size-4" /> },
];

export function LeadsView() {
  const [view, setView] = useState("tabla");
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<LeadSource | "all">("all");
  const [state, setState] = useState<LeadState | "all">("all");
  // Backend expone UN solo asignado (`assigned_to`/`assigned_to_name`), así que
  // setter y closer se unifican en un único filtro «Asignado».
  const [assigned, setAssigned] = useState<string>("all");

  // `?demo=1` fuerza los datos de ejemplo (revisar Fase 10 antes de Fase 9).
  // `?search=` preselecciona la búsqueda (p. ej. al llegar desde la ficha del
  // cliente, «Lead de origen»). Se lee tras montar para no desincronizar la
  // hidratación SSR.
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDemo(params.has("demo"));
    const initialSearch = params.get("search");
    if (initialSearch) setSearch(initialSearch);
  }, []);

  const [selected, setSelected] = useState<Lead | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  // Etiquetas activas del filtro (Bloque 1.4): el lead debe tenerlas TODAS.
  const [activeTags, setActiveTags] = useState<string[]>([]);
  // Lead pendiente de confirmar su motivo de pérdida (mini-modal, Bloque 1.3).
  const [lostCandidate, setLostCandidate] = useState<Lead | null>(null);

  // UN solo listado: origen y setter/closer son FILTROS, no tableros. La tabla
  // filtra además por estado; en los kanbans el estado lo marcan las columnas
  // (pipeline) o el par Perdido/Seguimiento (repesca).
  const debouncedSearch = useDebounce(search, 350);
  const query = useMemo(
    () => ({ search: debouncedSearch, source, state: view === "tabla" ? state : ("all" as const), demo }),
    [debouncedSearch, source, state, view, demo],
  );
  const { data: leads = [], isLoading } = useLeads(query);
  const updateLead = useUpdateLead();

  // El filtro «Asignado» opera sobre `assigned_to_name` (datos reales) y, en
  // demo, sobre setter/closer. El selector solo aparece si hay algún nombre.
  const assignedOptions = useMemo(
    () => [...new Set(leads.flatMap((l) => [l.assigned, l.setter, l.closer]).filter(Boolean))] as string[],
    [leads],
  );

  // Etiquetas disponibles para el filtro (todas las que llevan los leads).
  const allTags = useMemo(
    () => [...new Set(leads.flatMap((l) => l.tags))].sort((a, b) => a.localeCompare(b, "es")),
    [leads],
  );

  const visibleLeads = useMemo(() => {
    let out = leads;
    if (assigned !== "all") {
      out = out.filter((l) => l.assigned === assigned || l.setter === assigned || l.closer === assigned);
    }
    if (activeTags.length > 0) {
      out = out.filter((l) => activeTags.every((t) => l.tags.includes(t)));
    }
    // Fecha de ingreso DESC: las nuevas arriba (tabla y tarjetas kanban).
    return [...out].sort((a, b) => new Date(b.intake_date).getTime() - new Date(a.intake_date).getTime());
  }, [leads, assigned, activeTags]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  // Mantener sincronizado el lead abierto en el panel con los datos frescos.
  const openLead = selected ? (leads.find((l) => l.id === selected.id) ?? selected) : null;

  const handleOpen = (lead: Lead) => {
    setSelected(lead);
    setPanelOpen(true);
  };

  const handleMove = (id: string, newState: LeadState) => {
    // Al soltar en «Perdido», pedir el motivo ANTES de persistir (Bloque 1.3).
    if (newState === "Perdido") {
      const lead = leads.find((l) => l.id === id);
      if (lead && lead.state !== "Perdido") {
        setLostCandidate(lead);
        return;
      }
    }
    updateLead.mutate(
      { id, patch: { state: newState } },
      { onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo mover el lead") },
    );
  };

  const handleConfirmLost = (reason: LeadLostReason) => {
    if (!lostCandidate) return;
    updateLead.mutate(
      {
        id: lostCandidate.id,
        patch: {
          state: "Perdido",
          lost_reason: reason,
          // Sin objeción previa, el motivo también alimenta la Repesca.
          ...(lostCandidate.objection ? {} : { objection: LOST_REASON_TO_OBJECTION[reason] }),
        },
      },
      {
        onSuccess: () => toast.success(`${lostCandidate.name} → Perdido`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo mover el lead"),
      },
    );
    setLostCandidate(null);
  };

  /**
   * Guarda un cambio hecho desde una celda de la tabla.
   *
   * Usa `mutateAsync` y NO `mutate` a propósito: la celda pinta el valor nuevo
   * al instante y necesita que esto LANCE si el servidor lo rechaza, para poder
   * volver al valor anterior. Con `mutate` (que no devuelve promesa) la celda se
   * quedaría enseñando un valor que no se guardó.
   */
  const guardarCelda = (id: string, patch: UpdateLeadInput) => updateLead.mutateAsync({ id, patch });

  const handleSetObjection = (id: string, objection: LeadObjection) => {
    updateLead.mutate(
      { id, patch: { objection } },
      { onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo cambiar la objeción") },
    );
  };

  return (
    <div className="@container/main flex flex-col gap-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">CRM · Leads</h1>
          <p className="text-muted-foreground text-sm">
            Pipeline de captación desde web e Instagram: contacta, agenda, cierra… y repesca.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" />
            Importar CSV
          </Button>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4" />
            Nuevo lead
          </Button>
        </div>
      </div>

      {!LEADS_API_READY && (
        <div className="rounded-md border border-dashed bg-[#FFEDE0]/40 px-4 py-2.5 text-sm text-[#8a3d06] dark:bg-[#FF690B]/10 dark:text-[#ffa266]">
          Datos de ejemplo: el backend de leads (<code>/admin-panel/leads</code>) aún no está desplegado. Todo (tabla,
          kanban, notas, importación) queda listo para encender con <code>LEADS_API_READY = true</code>.
        </div>
      )}
      {LEADS_API_READY && demo && (
        <div className="rounded-md border border-dashed bg-[#FFEDE0]/40 px-4 py-2.5 text-sm text-[#8a3d06] dark:bg-[#FF690B]/10 dark:text-[#ffa266]">
          Vista de demostración (<code>?demo=1</code>): datos de ejemplo en memoria, no se toca la API real. Quita el
          parámetro de la URL para volver a los leads reales.
        </div>
      )}

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
          <Input
            placeholder="Buscar por nombre, email, teléfono o interés…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={source} onValueChange={(v: LeadSource | "all") => setSource(v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Origen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los orígenes</SelectItem>
            {LEAD_SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {LEAD_SOURCE_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {assignedOptions.length > 0 && (
          <Select value={assigned} onValueChange={setAssigned}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Asignado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el equipo</SelectItem>
              {assignedOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={state} onValueChange={(v: LeadState | "all") => setState(v)} disabled={view !== "tabla"}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {LEAD_STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtro por etiquetas (Bloque 1.4): chips con toggle */}
      {allTags.length > 0 && (
        <div className="-mt-2 flex flex-wrap items-center gap-1.5">
          <Tag className="text-muted-foreground size-3.5" />
          {allTags.map((tag) => {
            const active = activeTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                  active
                    ? "border-[#363C98] bg-[#EBEAF2] font-medium text-[#363C98] dark:bg-[#363C98]/30 dark:text-[#b9bce8]"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {tag}
              </button>
            );
          })}
          {activeTags.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTags([])}
              className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      <BrandTabs tabs={VIEW_TABS} active={view} onChange={setView} />

      {/* «Mis tareas de hoy» encima del kanban (Bloque 1.2) */}
      {view === "pipeline" && (
        <MyTasksPanel
          demo={demo}
          onOpenLead={(leadId) => {
            const lead = leads.find((l) => l.id === leadId);
            if (lead) handleOpen(lead);
          }}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : view === "tabla" ? (
        <Card>
          <CardContent className="pt-6">
            <LeadsTable
              leads={visibleLeads}
              onOpen={handleOpen}
              onConvertir={(lead) => handleOpen(lead)}
              onGuardar={guardarCelda}
            />
          </CardContent>
        </Card>
      ) : view === "pipeline" ? (
        <LeadsKanban leads={visibleLeads} onMove={handleMove} onOpen={handleOpen} />
      ) : (
        <LeadsRepesca leads={visibleLeads} onSetObjection={handleSetObjection} onOpen={handleOpen} />
      )}

      <LeadPanel lead={openLead} open={panelOpen} onOpenChange={setPanelOpen} />
      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} demo={demo} />
      <CreateLeadDialog open={createOpen} onOpenChange={setCreateOpen} demo={demo} />
      <LostReasonDialog
        open={lostCandidate !== null}
        leadName={lostCandidate?.name}
        onConfirm={handleConfirmLost}
        onCancel={() => setLostCandidate(null)}
      />
    </div>
  );
}
