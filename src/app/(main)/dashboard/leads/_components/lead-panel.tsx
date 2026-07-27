"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  Mail,
  Phone,
  Clock,
  StickyNote,
  Send,
  Tag,
  CalendarDays,
  CalendarClock,
  Euro,
  Plus,
  Trash2,
  UserCheck,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useCreateLeadTask, useDeleteLeadTask, useLeadTasks, useUpdateLeadTask } from "@/hooks/use-lead-tasks";
import { useAddLeadNote, useConvertLead, useUpdateLead } from "@/hooks/use-leads";
import { LEAD_TASKS_API_READY } from "@/lib/services/lead-tasks-service";
import {
  LEAD_CONVERT_READY,
  LEAD_LOST_REASONS,
  LEAD_LOST_REASON_LABEL,
  LEAD_OBJECTIONS,
  LEAD_OBJECTION_LABEL,
  LEAD_STATES,
  leadsPipelineV3Enabled,
  leadsV2WritesEnabled,
  type Lead,
  type LeadLostReason,
  type LeadObjection,
  type LeadState,
} from "@/lib/services/leads-service";
import { cn } from "@/lib/utils";

import { LeadCustomerBadge, LeadSourceBadge, LeadStateBadge, LeadValueBadge } from "./lead-badges";

interface LeadPanelProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      {icon}
      <span className="text-foreground">{children}</span>
    </div>
  );
}

/** Valor centinela del select de objeción para «sin clasificar». */
const NO_OBJECTION = "none";

export function LeadPanel({ lead, open, onOpenChange }: LeadPanelProps) {
  const updateLead = useUpdateLead();
  const convertLead = useConvertLead();
  const addNote = useAddLeadNote();
  const [noteDraft, setNoteDraft] = useState("");

  // ── Pipeline v3 (Bloque 1 CRM-GHL): valor, etiquetas y tareas ──
  const [valueDraft, setValueDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [taskTitleDraft, setTaskTitleDraft] = useState("");
  const [taskDueDraft, setTaskDueDraft] = useState("");
  const { data: tasks = [] } = useLeadTasks(lead?.id ?? undefined);
  const createTask = useCreateLeadTask();
  const updateTask = useUpdateLeadTask();
  const deleteTask = useDeleteLeadTask();

  // Sincroniza el borrador del valor al cambiar de lead (o al refrescar).
  const leadId = lead?.id;
  const leadValue = lead?.opportunity_value;
  useEffect(() => {
    setValueDraft(leadValue != null ? String(leadValue) : "");
    setTagDraft("");
    setTaskTitleDraft("");
    setTaskDueDraft("");
  }, [leadId, leadValue]);

  if (!lead) return null;

  const isSample = lead.id.startsWith("sample-");
  const v2Writes = isSample || leadsV2WritesEnabled();
  const canConvert = isSample || LEAD_CONVERT_READY;
  const v3Writes = isSample || leadsPipelineV3Enabled();

  const savePatch = (patch: Parameters<typeof updateLead.mutate>[0]["patch"], okMsg: string) => {
    updateLead.mutate(
      { id: lead.id, patch },
      {
        onSuccess: () => toast.success(okMsg),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
      },
    );
  };

  const handleSaveValue = () => {
    const trimmed = valueDraft.trim();
    const parsed = trimmed === "" ? null : Number(trimmed.replace(",", "."));
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
      toast.error("El valor debe ser un número positivo (en €)");
      return;
    }
    savePatch({ opportunity_value: parsed }, parsed === null ? "Valor retirado" : "Valor guardado");
  };

  const handleAddTag = () => {
    const tag = tagDraft.trim();
    if (!tag) return;
    if (lead.tags.includes(tag)) {
      setTagDraft("");
      return;
    }
    savePatch({ tags: [...lead.tags, tag] }, `Etiqueta «${tag}» añadida`);
    setTagDraft("");
  };

  const handleRemoveTag = (tag: string) => {
    savePatch({ tags: lead.tags.filter((t) => t !== tag) }, `Etiqueta «${tag}» quitada`);
  };

  const handleLostReason = (value: string) => {
    savePatch({ lost_reason: value as LeadLostReason }, `Motivo de pérdida → ${LEAD_LOST_REASON_LABEL[value as LeadLostReason]}`);
  };

  const handleCreateTask = () => {
    const title = taskTitleDraft.trim();
    if (!title || !taskDueDraft) return;
    createTask.mutate(
      { leadId: lead.id, input: { title, due_at: new Date(taskDueDraft).toISOString() } },
      {
        onSuccess: () => {
          setTaskTitleDraft("");
          setTaskDueDraft("");
          toast.success("Tarea creada");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
      },
    );
  };

  const handleState = (state: LeadState) => {
    updateLead.mutate(
      { id: lead.id, patch: { state } },
      {
        onSuccess: () => toast.success(`Estado → ${state}`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
      },
    );
  };

  const handleObjection = (value: string) => {
    const objection = value === NO_OBJECTION ? null : (value as LeadObjection);
    updateLead.mutate(
      { id: lead.id, patch: { objection } },
      {
        onSuccess: () =>
          toast.success(objection ? `Objeción → ${LEAD_OBJECTION_LABEL[objection]}` : "Objeción retirada"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
      },
    );
  };

  const handleConvert = () => {
    convertLead.mutate(lead.id, {
      onSuccess: (result) => {
        if (result.linked) {
          toast.success(`${lead.name} convertido en cliente ✅`);
        } else {
          // Ganado pero sin usuario enlazado: aviso claro (Fase 9.4).
          toast.warning(result.warning ?? "Convertido a ganado, pero sin usuario enlazado.", {
            duration: 8000,
          });
        }
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
    });
  };

  const handleAddNote = () => {
    if (!noteDraft.trim()) return;
    addNote.mutate(
      { id: lead.id, body: noteDraft.trim() },
      {
        onSuccess: () => {
          setNoteDraft("");
          toast.success("Nota añadida");
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "Error"),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-xl">{lead.name}</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-3">
            <LeadSourceBadge source={lead.source} />
            <LeadStateBadge state={lead.state} />
            {lead.opportunity_value != null && <LeadValueBadge value={lead.opportunity_value} />}
            {lead.is_customer && <LeadCustomerBadge />}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 py-4">
          {/* Datos de contacto */}
          <div className="space-y-2">
            {lead.email && <InfoRow icon={<Mail className="size-4" />}>{lead.email}</InfoRow>}
            {lead.phone && <InfoRow icon={<Phone className="size-4" />}>{lead.phone}</InfoRow>}
            {lead.interest && <InfoRow icon={<Tag className="size-4" />}>{lead.interest}</InfoRow>}
            {(lead.assigned ?? lead.setter ?? lead.closer) && (
              <InfoRow icon={<UserCheck className="size-4" />}>
                {lead.assigned
                  ? `Asignado: ${lead.assigned}`
                  : [lead.setter && `Setter: ${lead.setter}`, lead.closer && `Closer: ${lead.closer}`]
                      .filter(Boolean)
                      .join(" · ")}
              </InfoRow>
            )}
            <InfoRow icon={<CalendarDays className="size-4" />}>
              Alta {new Date(lead.intake_date).toLocaleDateString("es-ES")}
            </InfoRow>
          </div>

          {/* Conversión en cliente */}
          <Separator />
          <div className="space-y-2">
            {lead.is_customer ? (
              <div className="flex flex-wrap items-center gap-2">
                <LeadCustomerBadge />
                {lead.converted_user_id && (
                  <Button asChild variant="outline" size="sm" className="gap-1.5">
                    <Link href={`/dashboard/alumnos/${lead.converted_user_id}`}>
                      Ver ficha del cliente
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <>
                {lead.state === "Ganado" && (
                  <p className="rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                    Ganado sin cliente enlazado: no había un usuario con su email o teléfono. Reintenta el enlace cuando
                    el cliente cree su cuenta.
                  </p>
                )}
                <Button
                  className="w-full gap-2"
                  onClick={handleConvert}
                  disabled={!canConvert || convertLead.isPending}
                >
                  {convertLead.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserCheck className="size-4" />
                  )}
                  {lead.state === "Ganado" ? "Reintentar enlace de cliente" : "Convertir en cliente"}
                </Button>
                {!canConvert && (
                  <p className="text-muted-foreground text-xs">
                    Se activará cuando el backend (Fase 9) publique <code>POST /admin-panel/leads/:id/convert</code>.
                  </p>
                )}
              </>
            )}
          </div>

          <Separator />

          {/* Cambio de estado */}
          <div className="space-y-2">
            <Label>Estado del pipeline</Label>
            <Select value={lead.state} onValueChange={(v: LeadState) => handleState(v)} disabled={updateLead.isPending}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATES.map((s) => {
                  const v2Only = s === "Esperando pago" || s === "Seguimiento";
                  return (
                    <SelectItem key={s} value={s} disabled={v2Only && !v2Writes}>
                      {s}
                      {v2Only && !v2Writes ? " · Fase 9" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Objeción (repesca) */}
          <div className="space-y-2">
            <Label>Objeción de venta</Label>
            <Select
              value={lead.objection ?? NO_OBJECTION}
              onValueChange={handleObjection}
              disabled={updateLead.isPending || !v2Writes}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_OBJECTION}>Sin clasificar</SelectItem>
                {LEAD_OBJECTIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {LEAD_OBJECTION_LABEL[o]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!v2Writes && (
              <p className="text-muted-foreground text-xs">
                Editable cuando el backend (Fase 9) publique el campo <code>objection</code>.
              </p>
            )}
          </div>

          {/* Motivo de pérdida (Bloque 1.3) — solo con el lead perdido */}
          {(lead.state === "Perdido" || lead.lost_reason) && (
            <div className="space-y-2">
              <Label>Motivo de pérdida</Label>
              <Select
                value={lead.lost_reason ?? ""}
                onValueChange={handleLostReason}
                disabled={updateLead.isPending || !v3Writes}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin motivo registrado" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_LOST_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {LEAD_LOST_REASON_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {/* Valor de la oportunidad (Bloque 1.1) */}
          <div className="space-y-2">
            <Label htmlFor="lead-value" className="flex items-center gap-1.5">
              <Euro className="size-3.5" />
              Valor de la oportunidad (€)
            </Label>
            <div className="flex gap-2">
              <Input
                id="lead-value"
                type="number"
                min={0}
                step={50}
                inputMode="decimal"
                placeholder="p. ej. 1200"
                value={valueDraft}
                onChange={(e) => setValueDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveValue()}
                disabled={updateLead.isPending || !v3Writes}
              />
              <Button
                variant="outline"
                onClick={handleSaveValue}
                disabled={updateLead.isPending || !v3Writes}
              >
                Guardar
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              € estimados según el programa de interés; el kanban los suma por etapa.
            </p>
          </div>

          {/* Etiquetas (Bloque 1.4) */}
          <div className="space-y-2">
            <Label htmlFor="lead-tag" className="flex items-center gap-1.5">
              <Tag className="size-3.5" />
              Etiquetas
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {lead.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-muted inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    aria-label={`Quitar etiqueta ${tag}`}
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => handleRemoveTag(tag)}
                    disabled={updateLead.isPending || !v3Writes}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {lead.tags.length === 0 && (
                <span className="text-muted-foreground text-xs">Sin etiquetas (caliente, VIP, objeción-precio…).</span>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                id="lead-tag"
                placeholder="Nueva etiqueta…"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                disabled={updateLead.isPending || !v3Writes}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleAddTag}
                disabled={!tagDraft.trim() || updateLead.isPending || !v3Writes}
                aria-label="Añadir etiqueta"
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {!v3Writes && (
              <p className="text-muted-foreground text-xs">
                Valor, etiquetas y motivo se activan al desplegar el backend (
                <code>feature/crm-pipeline-completo</code>).
              </p>
            )}
          </div>

          <Separator />

          {/* Tareas con fecha (Bloque 1.2) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="size-4" />
              Tareas
              {!LEAD_TASKS_API_READY && !isSample && (
                <span className="text-muted-foreground text-xs font-normal">(demo hasta desplegar el backend)</span>
              )}
            </div>
            <div className="space-y-1.5">
              {tasks.length === 0 && (
                <p className="text-muted-foreground text-xs">Sin tareas. Crea una: «llamar el martes», «enviar propuesta»…</p>
              )}
              {tasks.map((task) => (
                <div key={task.id} className="bg-muted/40 flex items-center gap-2 rounded-md border px-2.5 py-1.5">
                  <Checkbox
                    checked={task.done}
                    onCheckedChange={(checked) =>
                      updateTask.mutate(
                        { leadId: lead.id, taskId: task.id, patch: { done: checked === true } },
                        { onError: (e) => toast.error(e instanceof Error ? e.message : "Error") },
                      )
                    }
                    aria-label={`Marcar «${task.title}» como hecha`}
                  />
                  <span className={cn("min-w-0 flex-1 truncate text-sm", task.done && "text-muted-foreground line-through")}>
                    {task.title}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {new Date(task.due_at).toLocaleString("es-ES", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <button
                    type="button"
                    aria-label={`Eliminar «${task.title}»`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      deleteTask.mutate(
                        { leadId: lead.id, taskId: task.id },
                        { onError: (e) => toast.error(e instanceof Error ? e.message : "Error") },
                      )
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Título de la tarea…"
                value={taskTitleDraft}
                onChange={(e) => setTaskTitleDraft(e.target.value)}
              />
              <div className="flex gap-2">
                <Input
                  type="datetime-local"
                  value={taskDueDraft}
                  onChange={(e) => setTaskDueDraft(e.target.value)}
                  aria-label="Fecha y hora de la tarea"
                />
                <Button
                  variant="outline"
                  onClick={handleCreateTask}
                  disabled={!taskTitleDraft.trim() || !taskDueDraft || createTask.isPending}
                  className="gap-1.5"
                >
                  <Plus className="size-4" />
                  Añadir
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <StickyNote className="size-4" />
              Notas
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder="Escribe una nota…"
                className="min-h-[60px] resize-none"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
              />
              <Button
                size="icon"
                onClick={handleAddNote}
                disabled={!noteDraft.trim() || addNote.isPending}
                aria-label="Añadir nota"
              >
                <Send className="size-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {lead.notes.length === 0 && <p className="text-muted-foreground text-xs">Sin notas todavía.</p>}
              {lead.notes.map((n) => (
                <div key={n.id} className="bg-muted/40 rounded-md border p-2.5 text-sm">
                  <p>{n.body}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {n.author ?? "Staff"} · {new Date(n.created_at).toLocaleString("es-ES")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Historial */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="size-4" />
              Historial
            </div>
            <ol className="relative space-y-3 border-l pl-4">
              {lead.history
                .slice()
                .reverse()
                .map((h) => (
                  <li key={h.id} className="relative">
                    <span className="bg-primary absolute top-1 -left-[21px] size-2 rounded-full" />
                    <p className="text-sm">
                      {h.event}
                      {h.from_state && h.to_state && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({h.from_state} → {h.to_state})
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">{new Date(h.created_at).toLocaleString("es-ES")}</p>
                  </li>
                ))}
            </ol>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
