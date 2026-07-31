import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Curso } from "@/app/(main)/dashboard/cursos/_components/schema";
import {
  CursosService,
  CreateCursoDto,
  GetCursosParams,
  UploadVideoResponse,
  LinkVideoDto,
} from "@/lib/services/cursos-service";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const cursosKeys = {
  all: ["cursos"] as const,
  lists: () => [...cursosKeys.all, "list"] as const,
  list: (params?: GetCursosParams) => [...cursosKeys.lists(), params] as const,
  details: () => [...cursosKeys.all, "detail"] as const,
  detail: (id: string) => [...cursosKeys.details(), id] as const,
};

// ============================================================================
// QUERIES - LECTURA DE DATOS
// ============================================================================

/**
 * Hook para obtener todos los cursos
 * @param params - Parámetros de filtrado (opcional)
 */
export function useCursos(params?: GetCursosParams) {
  return useQuery({
    queryKey: cursosKeys.list(params),
    queryFn: () => CursosService.getCursos(params),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (antes cacheTime)
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook para obtener un curso específico por ID
 * @param id - ID del curso
 */
export function useCurso(id: string) {
  return useQuery({
    queryKey: cursosKeys.detail(id),
    queryFn: () => CursosService.getCursoById(id),
    enabled: !!id, // Solo ejecuta si hay ID
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// ============================================================================
// MUTATIONS - ESCRITURA DE DATOS
// ============================================================================

/**
 * Hook para crear un nuevo curso
 */
export function useCreateCurso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCursoDto) => CursosService.createCurso(data),
    onMutate: async () => {
      // Optimistic update podría ir aquí si lo necesitas
      toast.loading("Creando curso...", { id: "create-curso" });
    },
    onSuccess: (newCurso) => {
      // Invalidar queries para refrescar la lista
      queryClient.invalidateQueries({ queryKey: cursosKeys.lists() });

      // Opcional: Agregar el nuevo curso al cache
      queryClient.setQueryData(cursosKeys.detail(newCurso.id), newCurso);

      toast.success("Curso creado exitosamente", { id: "create-curso" });
    },
    onError: (error: Error) => {
      console.error("Error creando curso:", error);
      toast.error(error.message || "Error al crear el curso", { id: "create-curso" });
    },
  });
}

/**
 * Hook para actualizar un curso existente
 */
export function useUpdateCurso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCursoDto> }) => CursosService.updateCurso(id, data),
    onMutate: async ({ id }) => {
      toast.loading("Actualizando curso...", { id: `update-curso-${id}` });

      // Cancelar queries en curso para evitar conflictos
      await queryClient.cancelQueries({ queryKey: cursosKeys.detail(id) });

      // Guardar snapshot del estado anterior (para rollback)
      const previousCurso = queryClient.getQueryData<Curso>(cursosKeys.detail(id));

      return { previousCurso, id };
    },
    onSuccess: (updatedCurso, { id }) => {
      // Actualizar cache del curso específico
      queryClient.setQueryData(cursosKeys.detail(id), updatedCurso);

      // Invalidar lista para refrescar
      queryClient.invalidateQueries({ queryKey: cursosKeys.lists() });

      toast.success("Curso actualizado exitosamente", { id: `update-curso-${id}` });
    },
    onError: (error: Error, { id }, context) => {
      // Rollback en caso de error
      if (context?.previousCurso) {
        queryClient.setQueryData(cursosKeys.detail(id), context.previousCurso);
      }

      console.error("Error actualizando curso:", error);
      toast.error(error.message || "Error al actualizar el curso", { id: `update-curso-${id}` });
    },
  });
}

/**
 * Hook para eliminar un curso
 */
export function useDeleteCurso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => CursosService.deleteCurso(id),
    onMutate: async (id) => {
      toast.loading("Eliminando curso...", { id: `delete-curso-${id}` });

      // Cancelar queries relacionadas
      await queryClient.cancelQueries({ queryKey: cursosKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: cursosKeys.lists() });

      // Guardar snapshot para rollback
      const previousCursos = queryClient.getQueryData<Curso[]>(cursosKeys.lists());

      // Optimistic update: remover de la lista
      if (previousCursos) {
        queryClient.setQueryData(
          cursosKeys.lists(),
          previousCursos.filter((curso) => curso.id !== id),
        );
      }

      return { previousCursos };
    },
    onSuccess: (_, id) => {
      // Remover del cache individual
      queryClient.removeQueries({ queryKey: cursosKeys.detail(id) });

      // Invalidar lista
      queryClient.invalidateQueries({ queryKey: cursosKeys.lists() });

      toast.success("Curso eliminado exitosamente", { id: `delete-curso-${id}` });
    },
    onError: (error: Error, id, context) => {
      // Rollback en caso de error
      if (context?.previousCursos) {
        queryClient.setQueryData(cursosKeys.lists(), context.previousCursos);
      }

      console.error("Error eliminando curso:", error);
      toast.error(error.message || "Error al eliminar el curso", { id: `delete-curso-${id}` });
    },
  });
}

/**
 * Hook para activar/desactivar un curso
 *
 * NOTA: La API solo devuelve un mensaje, no el curso actualizado.
 * Usamos optimistic updates para actualizar la UI inmediatamente.
 */
export function useToggleCursoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "Activo" | "Inactivo" }) =>
      CursosService.toggleCursoStatus(id, status),
    onMutate: async ({ id, status }) => {
      const action = status === "Activo" ? "Activando" : "Desactivando";
      toast.loading(`${action} curso...`, { id: `toggle-curso-${id}` });

      // Cancelar queries para evitar conflictos
      await queryClient.cancelQueries({ queryKey: cursosKeys.lists() });
      await queryClient.cancelQueries({ queryKey: cursosKeys.detail(id) });

      // Guardar snapshot de la lista
      const previousCursos = queryClient.getQueryData<Curso[]>(cursosKeys.lists());

      // Optimistic update en la lista
      if (previousCursos) {
        const updatedCursos = previousCursos.map((curso) => (curso.id === id ? { ...curso, status } : curso));
        queryClient.setQueryData(cursosKeys.lists(), updatedCursos);
      }

      return { previousCursos, id };
    },
    onSuccess: (response, { id, status }) => {
      // Invalidar lista para refrescar con datos del servidor
      queryClient.invalidateQueries({ queryKey: cursosKeys.lists() });

      const action = status === "Activo" ? "activado" : "desactivado";
      toast.success(`Curso ${action} exitosamente`, { id: `toggle-curso-${id}` });

      console.log("📨 Respuesta del servidor:", response.message);
    },
    onError: (error: Error, { id }, context) => {
      // Rollback: restaurar la lista anterior
      if (context?.previousCursos) {
        queryClient.setQueryData(cursosKeys.lists(), context.previousCursos);
      }

      console.error("Error cambiando estado del curso:", error);
      toast.error(error.message || "Error al cambiar el estado", { id: `toggle-curso-${id}` });
    },
  });
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Hook para prefetch de un curso (útil para hover effects)
 */
export function usePrefetchCurso() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: cursosKeys.detail(id),
      queryFn: () => CursosService.getCursoById(id),
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Hook para invalidar todas las queries de cursos
 */
export function useInvalidateCursos() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: cursosKeys.all });
  };
}

// ============================================================================
// UPLOAD DE VIDEO
// ============================================================================

/**
 * Hook para subir el video de presentación de un curso
 * Endpoint: POST /api/v1/course/upload-video?course_id={id}
 */
export function useUploadCursoVideo() {
  const queryClient = useQueryClient();

  return useMutation<
    UploadVideoResponse,
    Error,
    { courseId: string; file: File; description?: string; priority?: number }
  >({
    mutationFn: ({ courseId, file, description, priority }) =>
      CursosService.uploadCursoVideo(courseId, file, description, priority),
    onMutate: ({ courseId }) => {
      toast.loading("Subiendo video...", { id: `upload-video-${courseId}` });
    },
    onSuccess: (response, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: cursosKeys.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: cursosKeys.lists() });
      toast.success(response.message ?? "Video subido exitosamente", {
        id: `upload-video-${courseId}`,
      });
    },
    onError: (error, { courseId }) => {
      console.error("Error subiendo video del curso:", error);
      toast.error(error.message || "Error al subir el video", {
        id: `upload-video-${courseId}`,
      });
    },
  });
}

/**
 * Hook para vincular un video externo a un curso
 * Endpoint: POST /api/v1/course/link-video?course_id={id}
 */
export function useLinkCursoVideo() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, { courseId: string; data: LinkVideoDto }>({
    mutationFn: ({ courseId, data }) => CursosService.linkCursoVideo(courseId, data),
    onMutate: ({ courseId }) => {
      toast.loading("Vinculando video externo...", { id: `link-video-${courseId}` });
    },
    onSuccess: (response, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: cursosKeys.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: cursosKeys.lists() });
      toast.success(response.message ?? "Video externo vinculado exitosamente", {
        id: `link-video-${courseId}`,
      });
    },
    onError: (error, { courseId }) => {
      console.error("Error vinculando video externo:", error);
      toast.error(error.message || "Error al vincular el video externo", {
        id: `link-video-${courseId}`,
      });
    },
  });
}

/**
 * Hook para eliminar un video de un curso
 * Endpoint: DELETE /api/v1/course/videos/{video_id}
 */
export function useDeleteCursoVideo() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, { videoId: string; courseId: string }>({
    mutationFn: ({ videoId }) => CursosService.deleteCursoVideo(videoId),
    onMutate: ({ videoId }) => {
      toast.loading("Eliminando video...", { id: `delete-video-${videoId}` });
    },
    onSuccess: (response, { videoId, courseId }) => {
      // Invalidar las queries para recargar los datos
      queryClient.invalidateQueries({ queryKey: cursosKeys.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: cursosKeys.lists() });
      toast.success(response.message ?? "Video eliminado exitosamente", {
        id: `delete-video-${videoId}`,
      });
    },
    onError: (error, { videoId }) => {
      console.error("Error eliminando video:", error);
      toast.error(error.message || "Error al eliminar el video", {
        id: `delete-video-${videoId}`,
      });
    },
  });
}

/**
 * Hook para marcar/desmarcar una clase (vídeo) de un curso como muestra
 * gratuita — mismo endpoint que los metadatos normales
 * (`PUT course/videos/:id/metadata`, PR #90 de SquatFit), pero como
 * mutación propia y con `retry: false`: un reintento automático solo
 * retrasa el aviso de error al staff sin cambiar el resultado (misma
 * lección que el PR de facturas y el del ranking de recetas).
 *
 * Se manda también el título/descripción/prioridad VIGENTES junto con
 * `is_free_sample`, no solo el flag: no hay garantía de que este PUT sea un
 * PATCH parcial, así que mandar solo el campo que cambia podría vaciar los
 * demás en el backend.
 */
export function useToggleCursoVideoFreeSample() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    Error,
    {
      videoId: string;
      courseId: string;
      nextValue: boolean;
      title: string;
      description?: string | null;
      priority?: number | null;
    }
  >({
    mutationFn: ({ videoId, nextValue, title, description, priority }) =>
      CursosService.updateCursoVideoMetadata(videoId, {
        title,
        description: description ?? undefined,
        priority: priority ?? undefined,
        is_free_sample: nextValue,
      }),
    retry: false,
    onSuccess: (_response, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: cursosKeys.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: cursosKeys.lists() });
    },
  });
}

/**
 * Hook para actualizar los metadatos de un video de un curso
 * Endpoint: PUT /api/v1/course/videos/{video_id}/metadata
 */
export function useUpdateCursoVideoMetadata() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    Error,
    { videoId: string; courseId: string; data: import("@/lib/services/cursos-service").UpdateVideoMetadataDto }
  >({
    mutationFn: ({ videoId, data }) => CursosService.updateCursoVideoMetadata(videoId, data),
    onMutate: ({ videoId }) => {
      toast.loading("Actualizando metadatos del video...", { id: `update-video-${videoId}` });
    },
    onSuccess: (response, { videoId, courseId }) => {
      queryClient.invalidateQueries({ queryKey: cursosKeys.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: cursosKeys.lists() });
      toast.success(response.message ?? "Metadatos actualizados exitosamente", {
        id: `update-video-${videoId}`,
      });
    },
    onError: (error, { videoId }) => {
      console.error("Error actualizando metadatos del video:", error);
      toast.error(error.message || "Error al actualizar los metadatos", {
        id: `update-video-${videoId}`,
      });
    },
  });
}
