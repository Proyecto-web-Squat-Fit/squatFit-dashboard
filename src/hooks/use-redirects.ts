import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  CreateRedirectInput,
  RedirectsQuery,
  RedirectsService,
  UpdateRedirectInput,
} from "@/lib/services/redirects-service";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const redirectsKeys = {
  all: ["redirects"] as const,
  lists: () => [...redirectsKeys.all, "list"] as const,
  list: (params?: RedirectsQuery) => [...redirectsKeys.lists(), params] as const,
};

// ============================================================================
// QUERIES
// ============================================================================

/** Lista de pretty links. Ordenados por hits en el backend. */
export function useRedirects(params?: RedirectsQuery) {
  return useQuery({
    queryKey: redirectsKeys.list(params),
    queryFn: () => RedirectsService.list(params),
    staleTime: 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCreateRedirect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRedirectInput) => RedirectsService.create(input),
    onSuccess: (redirect) => {
      queryClient.invalidateQueries({ queryKey: redirectsKeys.lists() });
      toast.success(`Redirección /r/${redirect.slug} creada`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo crear la redirección");
    },
  });
}

export function useUpdateRedirect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRedirectInput }) => RedirectsService.update(id, data),
    onSuccess: (redirect) => {
      queryClient.invalidateQueries({ queryKey: redirectsKeys.lists() });
      toast.success(`Redirección /r/${redirect.slug} actualizada`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo actualizar la redirección");
    },
  });
}

export function useDeleteRedirect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => RedirectsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: redirectsKeys.lists() });
      toast.success("Redirección eliminada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "No se pudo eliminar la redirección");
    },
  });
}
