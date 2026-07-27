"use client";

import { CalendarClock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeadTasksToday, useUpdateLeadTask } from "@/hooks/use-lead-tasks";
import { LEAD_TASKS_API_READY, type LeadTask } from "@/lib/services/lead-tasks-service";
import { cn } from "@/lib/utils";

interface MyTasksPanelProps {
  demo?: boolean;
  /** Abre la ficha del lead al pulsar su nombre (si el lead está cargado). */
  onOpenLead?: (leadId: string) => void;
}

/** ¿La tarea venció ANTES de hoy? (rojo + fecha en vez de hora) */
function isOverdue(task: LeadTask): boolean {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return new Date(task.due_at).getTime() < start.getTime();
}

function dueLabel(task: LeadTask): string {
  const due = new Date(task.due_at);
  if (isOverdue(task)) {
    return due.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }
  return due.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

/**
 * «Mis tareas de hoy» (Bloque 1.2 CRM-GHL): lista compacta encima del kanban
 * con las tareas de hoy + vencidas del staff autenticado. El checkbox marca
 * hecho (PATCH optimista); el nombre del lead abre su ficha.
 */
export function MyTasksPanel({ demo, onOpenLead }: MyTasksPanelProps) {
  const { data, isLoading } = useLeadTasksToday({ demo });
  const updateTask = useUpdateLeadTask();

  const tasks = data?.data ?? [];
  const overdue = data?.overdue ?? 0;

  const handleToggle = (task: LeadTask, done: boolean) => {
    updateTask.mutate(
      { leadId: task.lead_id, taskId: task.id, patch: { done }, demo },
      {
        onSuccess: () => {
          if (done) toast.success(`Tarea hecha: ${task.title}`);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo actualizar la tarea"),
      },
    );
  };

  if (!isLoading && tasks.length === 0) {
    return (
      <Card className="border-dashed py-3">
        <CardContent className="text-muted-foreground flex items-center gap-2 px-4 py-0 text-sm">
          <CheckCircle2 className="size-4 text-green-600" />
          Sin tareas pendientes para hoy.
          {!LEAD_TASKS_API_READY && !demo && (
            <span className="text-xs">
              (Las tareas se activan al desplegar el backend; revisa con <code>?demo=1</code>.)
            </span>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-2 py-3">
      <CardHeader className="px-4 py-0">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="size-4" />
          Mis tareas de hoy
          {tasks.length > 0 && (
            <Badge variant="secondary" className="rounded-full px-2 text-xs">
              {tasks.length}
            </Badge>
          )}
          {overdue > 0 && (
            <Badge className="rounded-full bg-rose-100 px-2 text-xs font-medium text-rose-700">
              {overdue} vencida{overdue === 1 ? "" : "s"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 py-0">
        {isLoading ? (
          <div className="space-y-1.5 px-2 pb-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <ul className="divide-y">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2.5 px-2 py-1.5">
                <Checkbox
                  checked={task.done}
                  onCheckedChange={(checked) => handleToggle(task, checked === true)}
                  aria-label={`Marcar «${task.title}» como hecha`}
                />
                <span className={cn("min-w-0 flex-1 truncate text-sm", task.done && "text-muted-foreground line-through")}>
                  {task.title}
                </span>
                {task.lead_name && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground max-w-[160px] truncate text-xs underline-offset-2 hover:underline"
                    onClick={() => onOpenLead?.(task.lead_id)}
                  >
                    {task.lead_name}
                  </button>
                )}
                <span
                  className={cn(
                    "shrink-0 text-xs tabular-nums",
                    isOverdue(task) ? "font-medium text-rose-600" : "text-muted-foreground",
                  )}
                >
                  {dueLabel(task)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
