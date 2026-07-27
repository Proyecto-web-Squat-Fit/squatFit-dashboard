import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  LeadTasksService,
  type CreateLeadTaskInput,
  type LeadTask,
  type LeadTasksTodayResult,
  type UpdateLeadTaskInput,
} from "@/lib/services/lead-tasks-service";

const TASKS_KEY = ["lead-tasks"] as const;

/** «Mis tareas de hoy» (hoy + vencidas del staff autenticado). */
export function useLeadTasksToday(opts?: { demo?: boolean }) {
  return useQuery<LeadTasksTodayResult>({
    queryKey: [...TASKS_KEY, "today", { demo: opts?.demo ?? false }],
    queryFn: () => LeadTasksService.getToday(opts),
    staleTime: 30_000,
  });
}

/** Tareas de un lead concreto (ficha). */
export function useLeadTasks(leadId: string | undefined, opts?: { demo?: boolean }) {
  return useQuery<LeadTask[]>({
    queryKey: [...TASKS_KEY, "lead", leadId, { demo: opts?.demo ?? false }],
    queryFn: () => LeadTasksService.getByLead(leadId!, opts),
    enabled: Boolean(leadId),
    staleTime: 15_000,
  });
}

export function useCreateLeadTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, input, demo }: { leadId: string; input: CreateLeadTaskInput; demo?: boolean }) =>
      LeadTasksService.create(leadId, input, { demo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

/** Editar o marcar hecha/deshecha una tarea (optimista en el panel de hoy). */
export function useUpdateLeadTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      leadId,
      taskId,
      patch,
      demo,
    }: {
      leadId: string;
      taskId: string;
      patch: UpdateLeadTaskInput;
      demo?: boolean;
    }) => LeadTasksService.update(leadId, taskId, patch, { demo }),
    // Optimista: el checkbox de «Mis tareas de hoy» responde al instante.
    onMutate: async ({ taskId, patch }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_KEY });
      const snapshots = queryClient.getQueriesData<LeadTasksTodayResult | LeadTask[]>({ queryKey: TASKS_KEY });
      for (const [key, data] of snapshots) {
        if (!data) continue;
        const applyPatch = (t: LeadTask): LeadTask => (t.id === taskId ? { ...t, ...patch } : t);
        if (Array.isArray(data)) {
          queryClient.setQueryData<LeadTask[]>(key, data.map(applyPatch));
        } else {
          queryClient.setQueryData<LeadTasksTodayResult>(key, { ...data, data: data.data.map(applyPatch) });
        }
      }
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useDeleteLeadTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, taskId, demo }: { leadId: string; taskId: string; demo?: boolean }) =>
      LeadTasksService.remove(leadId, taskId, { demo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}
