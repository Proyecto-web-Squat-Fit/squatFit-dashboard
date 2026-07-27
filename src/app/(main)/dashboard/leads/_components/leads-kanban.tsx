"use client";

import { useMemo, useState } from "react";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { BadgeCheck, CalendarDays, Mail, Phone } from "lucide-react";

import { PIPELINE_STATES, type Lead, type LeadState } from "@/lib/services/leads-service";
import { cn } from "@/lib/utils";

import { formatEuro, LeadSourceBadge, LeadTagChips, LeadValueBadge, STATE_STYLES } from "./lead-badges";

interface LeadsKanbanProps {
  leads: Lead[];
  onMove: (id: string, state: LeadState) => void;
  onOpen: (lead: Lead) => void;
}

function LeadCard({ lead, onOpen, dragging }: { lead: Lead; onOpen?: (l: Lead) => void; dragging?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(lead)}
      className={cn(
        "bg-card w-full rounded-lg border p-3 text-left shadow-sm transition-shadow hover:shadow-md",
        dragging && "rotate-1 shadow-lg",
      )}
    >
      <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
        {lead.name}
        {lead.is_customer && <BadgeCheck className="size-3.5 shrink-0 text-green-600" aria-label="Ya es cliente" />}
      </p>
      {lead.interest && <p className="text-muted-foreground mt-0.5 truncate text-xs">{lead.interest}</p>}
      {/* Valor de la oportunidad + etiquetas (Bloque 1 CRM-GHL) */}
      {(lead.opportunity_value != null || lead.tags.length > 0) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {lead.opportunity_value != null && <LeadValueBadge value={lead.opportunity_value} />}
          <LeadTagChips tags={lead.tags} max={3} />
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        <LeadSourceBadge source={lead.source} />
        <div className="text-muted-foreground flex items-center gap-2">
          {lead.email && <Mail className="size-3.5" />}
          {lead.phone && <Phone className="size-3.5" />}
        </div>
      </div>
      <p className="text-muted-foreground mt-1.5 flex items-center gap-1 text-[11px]">
        <CalendarDays className="size-3" />
        Alta {new Date(lead.intake_date).toLocaleDateString("es-ES")}
      </p>
    </button>
  );
}

function DraggableCard({ lead, onOpen }: { lead: Lead; onOpen: (l: Lead) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn("cursor-grab active:cursor-grabbing", isDragging && "opacity-40")}
    >
      <LeadCard lead={lead} onOpen={onOpen} />
    </div>
  );
}

function Column({ state, leads, onOpen }: { state: LeadState; leads: Lead[]; onOpen: (l: Lead) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: state });
  // Suma de valor por columna (Bloque 1.1): «X.XXX € en esta etapa».
  const valueSum = leads.reduce((acc, l) => acc + (l.opportunity_value ?? 0), 0);
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-muted/40 flex w-72 shrink-0 flex-col rounded-xl border-t-4 p-2 transition-colors",
        STATE_STYLES[state].column,
        isOver && "bg-muted ring-primary/40 ring-2",
      )}
    >
      <div className="flex items-center justify-between px-2 py-1.5">
        <span className="text-sm font-semibold">{state}</span>
        <span className="text-muted-foreground bg-background rounded-full px-2 py-0.5 text-xs font-medium">
          {leads.length}
        </span>
      </div>
      {valueSum > 0 && (
        <p className="text-muted-foreground -mt-1 px-2 pb-1 text-xs tabular-nums">
          <span className="text-foreground font-semibold">{formatEuro(valueSum)}</span> en esta etapa
        </p>
      )}
      <div className="flex min-h-[120px] flex-col gap-2 p-1">
        {leads.map((l) => (
          <DraggableCard key={l.id} lead={l} onOpen={onOpen} />
        ))}
        {leads.length === 0 && <p className="text-muted-foreground/70 px-2 py-6 text-center text-xs">Sin leads</p>}
      </div>
    </div>
  );
}

/**
 * Kanban «Pipeline comercial»: Nuevo → Contactado → Agendado → Llamada hecha →
 * Esperando pago → Ganado → Perdido. Las tarjetas llegan ya ordenadas por
 * fecha de ingreso DESC desde la vista. «Seguimiento» no es columna: se
 * gestiona desde el panel y vive en el kanban «Repesca».
 */
export function LeadsKanban({ leads, onMove, onOpen }: LeadsKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const byState = useMemo(() => {
    const map = Object.fromEntries(PIPELINE_STATES.map((s) => [s, [] as Lead[]])) as Record<LeadState, Lead[]>;
    for (const l of leads) map[l.state]?.push(l);
    return map;
  }, [leads]);

  const activeLead = activeId ? (leads.find((l) => l.id === activeId) ?? null) : null;

  const handleStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const target = over.id as LeadState;
    const lead = leads.find((l) => l.id === active.id);
    if (lead && PIPELINE_STATES.includes(target as (typeof PIPELINE_STATES)[number]) && lead.state !== target) {
      onMove(lead.id, target);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleStart} onDragEnd={handleEnd}>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {PIPELINE_STATES.map((state) => (
          <Column key={state} state={state} leads={byState[state]} onOpen={onOpen} />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? (
          <div className="w-72">
            <LeadCard lead={activeLead} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
