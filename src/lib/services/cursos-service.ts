import { Curso, CursoApi } from "@/app/(main)/dashboard/cursos/_components/schema";
import {
  PRODUCT_DELIVERY_WRITE_READY,
  deliveryToApi,
  type ProductDeliveryValue,
} from "@/components/product-delivery-fields";
import { getAuthToken } from "@/lib/auth/auth-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

// ============================================================================
// CONFIGURACIÓN DEL SERVICIO
// ============================================================================

const REQUEST_TIMEOUT = 10000;

// ============================================================================
// PORTADA DE CURSO (subida de archivo)
// ----------------------------------------------------------------------------
// El backend aún NO expone un endpoint para subir la imagen de portada de un
// curso (a día de hoy `POST/PUT admin-panel/courses` solo acepta `image` como
// URL string). Cuando la Fase 2/backend cree el endpoint multipart (patrón de
// libros: `FileInterceptor('image')` → GCS), poner aquí su ruta y el uploader
// del catálogo funcionará sin más cambios. Mientras sea `null`, el campo de
// portada de curso funciona en modo URL.
// ============================================================================
const COURSE_COVER_UPLOAD_ENDPOINT: string | null = null; // p.ej. "/api/v1/admin-panel/courses/image"

// ============================================================================
// TIPOS
// ============================================================================

// DTO para el formulario (desde la UI)
export interface CreateCursoDto {
  name: string;
  description: string;
  instructor: string;
  price: number;
  image?: string;
  video_presentation?: string;
  category?: string;
  // Duración y entrega (15.9) — campos de la UI (ver ProductDeliveryValue).
  access_type?: ProductDeliveryValue["accessType"];
  access_months?: number;
  drip_mode?: ProductDeliveryValue["dripMode"];
  drip_interval_days?: number;
  drip_start_delay_days?: number;
}

// DTO que espera la API (formato real del backend)
export interface CreateCursoApiDto {
  id?: string;
  title: string;
  subtitle: string;
  price: string;
  tutor_id: string;
  image?: string;
  video_presentation?: string;
  category?: string;
  // Duración/entrega (contrato real; solo se envían si PRODUCT_DELIVERY_WRITE_READY).
  access_months?: number | null;
  drip_mode?: string;
  drip_config?: Record<string, number | string>;
}

/**
 * Construye el fragmento de entrega del DTO (access_months/drip_mode/drip_config)
 * a partir de los campos de la UI. Devuelve `{}` si la escritura aún no está
 * habilitada (PRODUCT_DELIVERY_WRITE_READY), para no romper el alta/edición con
 * un 400 del `forbidNonWhitelisted` del backend.
 */
function buildDeliveryApiFields(data: Partial<CreateCursoDto>): Partial<CreateCursoApiDto> {
  if (!PRODUCT_DELIVERY_WRITE_READY) return {};
  if (!data.access_type && !data.drip_mode && data.access_months == null) return {};
  const payload = deliveryToApi({
    accessType: data.access_type ?? "permanent",
    accessMonths: data.access_months,
    dripMode: data.drip_mode ?? "none",
    dripIntervalDays: data.drip_interval_days,
    dripStartDelayDays: data.drip_start_delay_days,
  });
  return {
    access_months: payload.access_months,
    drip_mode: payload.drip_mode,
    drip_config: payload.drip_config,
  };
}

export interface UpdateCursoDto extends Partial<CreateCursoDto> {
  id: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GetCursosParams {
  page?: number;
  limit?: number;
  status?: "Activo" | "Inactivo" | "En Desarrollo";
  category?: string;
  level?: "Principiante" | "Intermedio" | "Avanzado";
}

export interface UploadVideoResponse {
  message: string;
  url?: string;
}

export interface LinkVideoDto {
  title: string;
  url: string;
  description?: string;
  priority?: number;
}

export interface UpdateVideoMetadataDto {
  title?: string;
  description?: string;
  priority?: number;
  /**
   * Muestra gratuita de la clase (PR #90 de SquatFit): la primera clase de
   * cada curso se marca así para que el panel del cliente recién registrado
   * tenga algo que enseñar en Cursos sin haber comprado nada — decisión de
   * Hamlet de no regalar el curso entero (eso resolvería solo esa sección),
   * sino una clase de cada uno. El endpoint YA acepta este campo hoy; lo que
   * todavía no expone es la LECTURA (`GET course/detail/:id` no devuelve
   * `video_is_free_sample` hasta que se despliegue el resto del PR #90).
   */
  is_free_sample?: boolean;
}

// ============================================================================
// SERVICIO DE CURSOS
// ============================================================================

/**
 * Servicio para manejar todas las operaciones relacionadas con cursos
 */
export class CursosService {
  /**
   * Configurar headers por defecto con token de autenticación
   */
  private static getDefaultHeaders(token: string | null): Record<string, string> {
    const defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    } else if (typeof window !== "undefined") {
      // Fallback a localStorage
      try {
        const fallbackToken = localStorage.getItem("authToken");
        if (fallbackToken) {
          defaultHeaders.Authorization = `Bearer ${fallbackToken}`;
        }
      } catch (error) {
        console.warn("Error accessing localStorage:", error);
      }
    }

    return defaultHeaders;
  }

  /**
   * Manejar errores de respuesta HTTP
   */
  private static async handleResponseError(response: Response): Promise<never> {
    const errorData = await response.json().catch(() => ({}));

    // Manejar errores de autenticación
    if (response.status === 401 || response.status === 403) {
      console.warn("Token de autenticación inválido o expirado");
      throw new Error("Unauthorized");
    }

    throw new Error(errorData.message ?? errorData.error ?? `Error ${response.status}: ${response.statusText}`);
  }

  /**
   * Manejar errores de petición
   */
  private static handleRequestError(error: unknown, timeoutId: NodeJS.Timeout): never {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("La petición tardó demasiado tiempo");
      }
      throw error;
    }

    throw new Error("Error de conexión con el servidor");
  }

  /**
   * Método privado para realizar peticiones HTTP al backend
   */
  private static async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken();
    const url = `${API_BASE_URL}${endpoint}`;

    console.log("🌐 CursosService: Haciendo petición a:", url);

    const defaultHeaders = this.getDefaultHeaders(token);

    // Crear controlador de abort para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleResponseError(response);
      }

      return await response.json();
    } catch (error) {
      this.handleRequestError(error, timeoutId);
    }
  }

  // ========================================================================
  // TRANSFORMADORES DE DATOS
  // ========================================================================

  /**
   * Valida si una URL de imagen es válida o es un placeholder genérico
   */
  private static isValidImageUrl(url: string | null | undefined): boolean {
    if (!url || typeof url !== "string" || url.trim() === "") {
      return false;
    }

    const trimmedUrl = url.trim();

    // Lista de URLs inválidas conocidas
    const invalidUrls = [
      "image.jpg",
      "/image.jpg",
      "https://storage.googleapis.com/course-images/image.jpg",
      "storage.googleapis.com/course-images/image.jpg",
      "fitness-fundamentals.jpg",
      "/fitness-fundamentals.jpg",
    ];

    // Filtrar URLs inválidas conocidas
    if (invalidUrls.includes(trimmedUrl)) {
      return false;
    }

    // Filtrar URLs que contengan "image.jpg" genérico
    if (trimmedUrl.toLowerCase().includes("/image.jpg") || trimmedUrl.toLowerCase().endsWith("image.jpg")) {
      return false;
    }

    // Filtrar URLs de Google Storage que sean genéricas o inválidas
    if (trimmedUrl.includes("storage.googleapis.com") && trimmedUrl.includes("/image.jpg")) {
      return false;
    }

    // Filtrar dominios de video para evitar usarlos como imágenes
    const lowerUrl = trimmedUrl.toLowerCase();
    if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be") || lowerUrl.includes("vimeo.com")) {
      return false;
    }

    return true;
  }

  /**
   * Transforma los datos de la API al formato esperado por la UI
   */
  private static transformCursoFromApi(apiCurso: CursoApi): Curso {
    // Manejo seguro del tutor (puede ser undefined en algunas respuestas)
    const instructorName = apiCurso.tutor
      ? `${apiCurso.tutor.firstName} ${apiCurso.tutor.lastName}`.trim()
      : "Sin instructor";

    const priceNumber = parseFloat(apiCurso.price) || 0;

    // Convertir students a número: el back puede enviar string; si no convertimos, al sumar se concatenan ("0"+"1"+"0" → "010").
    const rawStudents = (apiCurso as { students?: unknown }).students;
    const students = Number(rawStudents) || 0;

    // Validar y filtrar imágenes inválidas antes de asignarlas
    const validThumbnail = apiCurso.image && this.isValidImageUrl(apiCurso.image) ? apiCurso.image : undefined;

    return {
      id: apiCurso.id,
      name: apiCurso.title,
      description: apiCurso.subtitle || "Sin descripción",
      instructor: instructorName,
      price: priceNumber,
      currency: "€",
      // Antes esto era el string fijo "Activo": el badge y el filtro de la
      // tabla ignoraban el `active` real del curso (mentira útil para el
      // mock, pero en producción escondía los cursos ya desactivados y
      // deshacía el toggle en cuanto se refrescaba la lista tras usarlo).
      status: apiCurso.active === false ? "Inactivo" : "Activo",
      students,
      duration: "8 semanas", // Valor por defecto
      level: "Principiante", // Valor por defecto
      category: (apiCurso as { category?: string }).category ?? "General",
      thumbnail: validThumbnail,
      tutorId: apiCurso.tutor?.id,
      tutorFirstName: apiCurso.tutor?.firstName,
      tutorLastName: apiCurso.tutor?.lastName,
      tutorProfilePicture: apiCurso.tutor?.profile_picture,
      videoPresentation: apiCurso.video_presentation || undefined,
      videos: (apiCurso as any).videos || undefined,
      // Recuento de clases de muestra, ya resuelto por GET course/all. Sin
      // `?? 0`: undefined significa «este backend no lo manda» y la celda
      // lo distingue de un 0 de verdad.
      freeSampleCount: (apiCurso as { free_sample_count?: number }).free_sample_count,
    };
  }

  // ========================================================================
  // MÉTODOS PÚBLICOS DEL SERVICIO
  // ========================================================================

  /**
   * Obtiene todos los cursos
   * Endpoint: GET /api/v1/admin-panel/courses
   */
  static async getCursos(params?: GetCursosParams): Promise<Curso[]> {
    try {
      console.log("🔍 CursosService: Obteniendo cursos...");

      // Construir query params
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.status) queryParams.append("status", params.status);
      if (params?.category) queryParams.append("category", params.category);
      if (params?.level) queryParams.append("level", params.level);

      const queryString = queryParams.toString();
      const endpoint = `/api/v1/admin-panel/courses${queryString ? `?${queryString}` : ""}`;

      const response = await this.makeRequest<any>(endpoint);

      // Log: datos crudos enviados por el backend
      console.log("📦 CursosService: Respuesta completa del back:", response);
      if (typeof response === "object" && response !== null) {
        const arr = Array.isArray(response) ? response : (response?.data ?? response?.courses ?? []);
        if (Array.isArray(arr) && arr.length > 0) {
          console.log("📋 CursosService: Datos por curso (tal como los envía el back):", {
            totalCursos: arr.length,
            cursos: arr.map((c: Record<string, unknown>, i: number) => ({
              index: i + 1,
              id: c.id,
              title: c.title,
              students: c.students,
              studentsType: typeof c.students,
            })),
          });
        }
      }

      // Manejar diferentes estructuras de respuesta
      let cursosApi: CursoApi[] = [];

      if (Array.isArray(response)) {
        // La API devuelve directamente el array
        cursosApi = response;
      } else if (response?.data && Array.isArray(response.data)) {
        // La API devuelve { data: [...] }
        cursosApi = response.data;
      } else if (response?.courses && Array.isArray(response.courses)) {
        // La API devuelve { courses: [...] }
        cursosApi = response.courses;
      } else {
        console.warn("⚠️ CursosService: Estructura de respuesta desconocida", response);
        cursosApi = [];
      }

      // Transformar los datos de la API al formato de la UI
      const cursos: Curso[] = cursosApi.map((apiCurso) => this.transformCursoFromApi(apiCurso));

      console.log(`✅ CursosService: ${cursos.length} cursos obtenidos y transformados`);
      return cursos;
    } catch (error) {
      console.error("❌ CursosService: Error obteniendo cursos:", error);
      throw error;
    }
  }

  /**
   * Obtiene un curso por ID
   * Endpoint: GET /api/v1/course/detail/{id}
   */
  static async getCursoById(id: string): Promise<Curso> {
    if (!id) {
      throw new Error("ID de curso requerido");
    }

    try {
      console.log(`📡 Llamando endpoint de detalle de curso: /api/v1/course/detail/${id}`);
      const response = await this.makeRequest<any>(`/api/v1/course/detail/${id}`);

      console.log("=== RESPUESTA ENDPOINT /api/v1/course/detail ===");
      console.log(response);
      console.log("==================================================");
      const rawData = response.data || response;
      return this.transformCursoFromApi(rawData);
    } catch (error) {
      console.error("Error obteniendo curso:", error);
      throw error;
    }
  }

  /**
   * Transforma los datos del formulario al formato esperado por la API
   */
  private static transformToApiFormat(data: CreateCursoDto): CreateCursoApiDto {
    return {
      title: data.name,
      subtitle: data.description,
      price: data.price.toString(),
      tutor_id: data.instructor,
      image: data.image ?? "",
      video_presentation: data.video_presentation ?? "",
      // Campos de duración/entrega (solo si PRODUCT_DELIVERY_WRITE_READY).
      ...buildDeliveryApiFields(data),
    };
  }

  /**
   * Crea un nuevo curso
   * Endpoint: POST /api/v1/admin-panel/courses
   */
  static async createCurso(data: CreateCursoDto): Promise<Curso> {
    if (!data.name || !data.description) {
      throw new Error("Nombre y descripción son requeridos");
    }

    try {
      console.log("📝 CursosService: Creando nuevo curso:", data.name);

      // Transformar datos del formulario al formato de la API
      const apiData = this.transformToApiFormat(data);

      console.log("📤 CursosService: Datos enviados a la API:", apiData);

      const response = await this.makeRequest<any>("/api/v1/admin-panel/courses", {
        method: "POST",
        body: JSON.stringify(apiData),
      });

      console.log("✅ CursosService: Curso creado exitosamente");
      console.log("📦 CursosService: Respuesta de la API:", response);

      // Si la respuesta es un array, tomar el primer elemento
      const cursoData = Array.isArray(response) ? response[0] : response.data || response;

      // Transformar la respuesta al formato de la UI
      return this.transformCursoFromApi(cursoData);
    } catch (error) {
      console.error("Error creando curso:", error);
      throw error;
    }
  }

  /**
   * Actualiza un curso existente
   * Endpoint: PUT /api/v1/admin-panel/courses?course_id={id}
   */
  static async updateCurso(id: string, data: Partial<CreateCursoDto>): Promise<Curso> {
    if (!id) {
      throw new Error("ID de curso requerido");
    }

    try {
      console.log("📝 CursosService: Actualizando curso:", id);

      // Transformar datos al formato de la API (solo los campos proporcionados)
      const apiData: Partial<CreateCursoApiDto> = {};

      if (data.name) apiData.title = data.name;
      if (data.description) apiData.subtitle = data.description;
      if (data.category) apiData.category = data.category;
      if (data.price !== undefined) apiData.price = data.price.toString();
      if (data.instructor) apiData.tutor_id = data.instructor;

      // Campos de duración/entrega (solo si PRODUCT_DELIVERY_WRITE_READY).
      Object.assign(apiData, buildDeliveryApiFields(data));

      console.log("📤 CursosService: Datos enviados a la API:", apiData);

      const response = await this.makeRequest<any>(`/api/v1/admin-panel/courses?course_id=${id}`, {
        method: "PUT",
        body: JSON.stringify(apiData),
      });

      console.log("✅ CursosService: Curso actualizado exitosamente");
      console.log("📦 CursosService: Respuesta de la API:", response);

      // Transformar la respuesta al formato de la UI
      const cursoData = Array.isArray(response) ? response[0] : response.data || response;
      return this.transformCursoFromApi(cursoData);
    } catch (error) {
      console.error("Error actualizando curso:", error);
      throw error;
    }
  }

  /**
   * Elimina un curso
   * Endpoint: DELETE /api/v1/admin-panel/courses?course_id={id}
   * Elimina permanentemente un curso de la plataforma.
   */
  static async deleteCurso(id: string): Promise<void> {
    if (!id) {
      throw new Error("ID de curso requerido");
    }

    try {
      console.log("🗑️ CursosService: Eliminando curso:", id);

      await this.makeRequest<{ success?: boolean; message?: string }>(`/api/v1/admin-panel/courses?course_id=${id}`, {
        method: "DELETE",
      });

      console.log("✅ CursosService: Curso eliminado exitosamente");
    } catch (error) {
      console.error("Error eliminando curso:", error);
      throw error;
    }
  }

  /**
   * Activa o desactiva un curso
   * Endpoint: PUT /api/v1/admin-panel/courses/status
   *
   * NOTA: La API solo devuelve un mensaje de confirmación, no el curso actualizado
   * Ejemplo respuesta: { "message": "Curso activado exitosamente" }
   */
  static async toggleCursoStatus(id: string, status: "Activo" | "Inactivo"): Promise<{ message: string }> {
    if (!id) {
      throw new Error("ID de curso requerido");
    }

    try {
      console.log("🔄 CursosService: Cambiando estado del curso:", id, "a", status);

      // Convertir status a boolean para la API
      const active = status === "Activo";

      const requestBody = {
        course_id: id,
        active: active,
      };

      console.log("📤 CursosService: Datos enviados a la API:", requestBody);

      const response = await this.makeRequest<{ message: string }>(`/api/v1/admin-panel/courses/status`, {
        method: "PUT",
        body: JSON.stringify(requestBody),
      });

      console.log("✅ CursosService: Estado del curso actualizado");
      console.log("📦 CursosService: Respuesta de la API:", response);

      // La API solo devuelve { message: "Curso activado/desactivado exitosamente" }
      return response;
    } catch (error) {
      console.error("Error cambiando estado del curso:", error);
      throw error;
    }
  }

  /**
   * Sube un archivo de video y lo asocia a un curso
   * Endpoint: POST /api/v1/course/upload-video?course_id={id}
   *
   * NOTA: Usa multipart/form-data. No se establece Content-Type manualmente
   * para que el navegador añada el boundary correcto.
   */
  static async uploadCursoVideo(
    courseId: string,
    file: File,
    description?: string,
    priority?: number,
  ): Promise<UploadVideoResponse> {
    if (!courseId) {
      throw new Error("ID de curso requerido");
    }
    if (!file) {
      throw new Error("Archivo de video requerido");
    }

    const token = getAuthToken() ?? (typeof window !== "undefined" ? localStorage.getItem("authToken") : null);
    const url = `${API_BASE_URL}/api/v1/course/upload-video?course_id=${courseId}`;

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (description) {
      formData.append("description", description);
    }
    if (priority !== undefined) {
      formData.append("priority", priority.toString());
    }

    // Timeout extendido (2 minutos) para archivos de video pesados
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);

    try {
      console.log("📹 CursosService: Subiendo video al curso:", courseId);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleResponseError(response);
      }

      const result: UploadVideoResponse = await response.json();
      console.log("✅ CursosService: Video subido exitosamente:", result);
      return result;
    } catch (error) {
      this.handleRequestError(error, timeoutId);
    }
  }

  /**
   * Sube la imagen de portada de un curso y devuelve su URL pública (la que lee
   * el carrito de la web). Requiere que el backend exponga el endpoint multipart
   * indicado en `COURSE_COVER_UPLOAD_ENDPOINT` (ver nota arriba). Si aún no
   * existe, lanza un error claro para que el back office use el modo URL.
   */
  static async uploadCursoImage(file: File): Promise<string> {
    if (!file) {
      throw new Error("Archivo de imagen requerido");
    }
    if (!COURSE_COVER_UPLOAD_ENDPOINT) {
      throw new Error(
        "La subida de portada de curso aún no está disponible en el backend. Pega la URL de la imagen (Storage) mientras tanto.",
      );
    }

    const token = getAuthToken() ?? (typeof window !== "undefined" ? localStorage.getItem("authToken") : null);
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API_BASE_URL}${COURSE_COVER_UPLOAD_ENDPOINT}`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      await this.handleResponseError(response);
    }

    const result = await response.json();
    // El backend puede devolver { image } | { url } | { data: { image } }
    return result?.image ?? result?.url ?? result?.data?.image ?? "";
  }

  /**
   * Vincula un video mediante una URL externa (ej. YouTube, Vimeo) sin subir archivo físico
   * Endpoint: POST /api/v1/course/link-video?course_id={id}
   */
  static async linkCursoVideo(courseId: string, data: LinkVideoDto): Promise<{ message: string }> {
    if (!courseId) {
      throw new Error("ID de curso requerido");
    }
    if (!data.title || !data.url) {
      throw new Error("Título y URL de video son requeridos");
    }

    try {
      console.log("🔗 CursosService: Vinculando video externo al curso:", courseId);
      console.log("📤 CursosService: Datos enviados a la API:", data);

      const response = await this.makeRequest<{ message: string }>(`/api/v1/course/link-video?course_id=${courseId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });

      console.log("✅ CursosService: Video externo vinculado exitosamente");
      return response;
    } catch (error) {
      console.error("Error vinculando video externo:", error);
      throw error;
    }
  }

  /**
   * Elimina un video del currículo de un curso
   * Endpoint: DELETE /api/v1/course/videos/{video_id}
   */
  static async deleteCursoVideo(videoId: string): Promise<{ message: string }> {
    if (!videoId) {
      throw new Error("ID de video requerido");
    }

    try {
      console.log("🗑️ CursosService: Eliminando video:", videoId);

      const response = await this.makeRequest<{ message: string }>(`/api/v1/course/videos/${videoId}`, {
        method: "DELETE",
      });

      console.log("✅ CursosService: Video eliminado exitosamente");
      return response;
    } catch (error) {
      console.error("Error eliminando video:", error);
      throw error;
    }
  }

  /**
   * Actualiza los metadatos de un video (título, descripción, prioridad)
   * Endpoint: PUT /api/v1/course/videos/{video_id}/metadata
   */
  static async updateCursoVideoMetadata(videoId: string, data: UpdateVideoMetadataDto): Promise<{ message: string }> {
    if (!videoId) {
      throw new Error("ID de video requerido");
    }

    try {
      console.log("✏️ CursosService: Actualizando metadatos de video:", videoId);

      const response = await this.makeRequest<{ message: string }>(`/api/v1/course/videos/${videoId}/metadata`, {
        method: "PUT",
        body: JSON.stringify(data),
      });

      console.log("✅ CursosService: Metadatos de video actualizados exitosamente");
      return response;
    } catch (error) {
      console.error("Error actualizando metadatos de video:", error);
      throw error;
    }
  }

  /**
   * Método de utilidad para verificar la conectividad con el backend
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const token = getAuthToken();
      if (!token) {
        console.log("Health check: No hay token disponible");
        return false;
      }

      await this.makeRequest<{ status: string }>("/api/v1/health");
      return true;
    } catch (error) {
      console.error("Health check falló:", error);
      return false;
    }
  }
}
