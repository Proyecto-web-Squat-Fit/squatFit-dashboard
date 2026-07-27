import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  LeadsService,
  type CreateLeadInput,
  type Lead,
  type LeadsQuery,
  type UpdateLeadInput,
} from "@/lib/services/leads-service";

const LEADS_KEY = ["leads"] as const;

export function useLeads(query?: LeadsQuery) {
  return useQuery<Lead[]>({
    queryKey: [...LEADS_KEY, query ?? {}],
    queryFn: () => LeadsService.getLeads(query),
    staleTime: 15_000,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, demo }: { input: CreateLeadInput; demo?: boolean }) =>
      LeadsService.createLead(input, { demo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LEADS_KEY }),
  });
}

/** Actualiza estado y/o objeción con actualización optimista en los kanbans. */
export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateLeadInput }) => LeadsService.updateLead(id, patch),
    // Optimista: mueve la tarjeta de columna al instante (pipeline y repesca).
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: LEADS_KEY });
      const snapshots = queryClient.getQueriesData<Lead[]>({ queryKey: LEADS_KEY });
      for (const [key, data] of snapshots) {
        if (!data) continue;
        queryClient.setQueryData<Lead[]>(
          key,
          data.map((l) =>
            l.id === id
              ? {
                  ...l,
                  ...(patch.state ? { state: patch.state } : {}),
                  ...(patch.objection !== undefined ? { objection: patch.objection ?? undefined } : {}),
                  ...(patch.opportunity_value !== undefined
                    ? { opportunity_value: patch.opportunity_value ?? undefined }
                    : {}),
                  ...(patch.lost_reason !== undefined ? { lost_reason: patch.lost_reason ?? undefined } : {}),
                  ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
                }
              : l,
          ),
        );
      }
      return { snapshots };
    },
    onError: (_err, _vars, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: LEADS_KEY }),
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => LeadsService.convertLead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LEADS_KEY }),
  });
}

export function useAddLeadNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => LeadsService.addNote(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LEADS_KEY }),
  });
}

export function useImportLeadsCsv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, demo }: { file: File; demo?: boolean }) => LeadsService.importCsv(file, { demo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LEADS_KEY }),
  });
}
