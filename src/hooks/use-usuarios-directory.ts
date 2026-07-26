import { useQuery } from "@tanstack/react-query";

import { UsuariosDirectoryService, type GetUsuariosDirectoryParams } from "@/lib/services/usuarios-directory-service";

export const usuariosDirectoryKeys = {
  all: ["usuarios-directory"] as const,
  list: (params: GetUsuariosDirectoryParams) => [...usuariosDirectoryKeys.all, params] as const,
};

export function useUsuariosDirectory(params: GetUsuariosDirectoryParams = {}) {
  return useQuery({
    queryKey: usuariosDirectoryKeys.list(params),
    queryFn: () => UsuariosDirectoryService.getDirectory(params),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}
