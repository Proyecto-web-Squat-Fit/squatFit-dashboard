import { Entrenador } from "@/app/(main)/dashboard/equipo/_components/schema";
import { getAuthToken } from "@/lib/auth/auth-utils";

// ============================================================================
// CONFIGURACIÓN DEL SERVICIO
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://squatfit-api-cyrc2g3zra-no.a.run.app";
const REQUEST_TIMEOUT = 10000;

// ============================================================================
// TIPOS
// ============================================================================

export interface CreateEntrenadorDto {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password?: string;
}

export interface UpdateEntrenadorDto extends Partial<CreateEntrenadorDto> {
  id: string;
  status?: "Activo" | "Inactivo" | "Vacaciones" | "Pendiente";
  availability?: "Disponible" | "Ocupado" | "No Disponible";
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

export interface GetEntrenadoresParams {
  page?: number;
  limit?: number;
  status?: "Activo" | "Inactivo" | "Vacaciones" | "Pendiente";
  specialty?: string;
  availability?: "Disponible" | "Ocupado" | "No Disponible";
  /** Si es true, incluye coaches inactivos. Útil para selectores de asignación. */
  include_inactive?: boolean;
}

// ============================================================================
// SERVICIO DE ENTRENADORES
// ============================================================================

/**
 * Servicio para manejar todas las operaciones relacionadas con entrenadores
 */
export class EntrenadoresService {
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

    console.log("🌐 EntrenadoresService: Haciendo petición a:", url);

    const defaultHeaders = this.getDefaultHeaders(token);

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
  // MÉTODOS PÚBLICOS DEL SERVICIO
  // ========================================================================

  /**
   * Obtiene todos los entrenadores
   * Endpoint: GET /api/v1/admin-panel/coaches
   */
  static async getEntrenadores(params?: GetEntrenadoresParams): Promise<Entrenador[]> {
    try {
      console.log("🔍 EntrenadoresService: Obteniendo entrenadores...");

      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.status) queryParams.append("status", params.status);
      if (params?.specialty) queryParams.append("specialty", params.specialty);
      if (params?.availability) queryParams.append("availability", params.availability);
      if (params?.include_inactive !== undefined)
        queryParams.append("include_inactive", String(params.include_inactive));

      const queryString = queryParams.toString();
      const endpoint = `/api/v1/admin-panel/coaches${queryString ? `?${queryString}` : ""}`;

      // El API devuelve un array directamente, no un objeto con data
      const response = await this.makeRequest<Entrenador[]>(endpoint);

      console.log(`✅ EntrenadoresService: ${response.length} entrenadores obtenidos`);
      return response;
    } catch (error) {
      console.error("❌ EntrenadoresService: Error obteniendo entrenadores:", error);
      throw error;
    }
  }

  /**
   * Obtiene un entrenador por ID
   * Endpoint: GET /api/v1/coaches/{id}
   */
  static async getEntrenadorById(id: string): Promise<Entrenador> {
    if (!id) {
      throw new Error("ID de entrenador requerido");
    }

    try {
      const response = await this.makeRequest<ApiResponse<Entrenador>>(`/api/v1/coaches/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error obteniendo entrenador:", error);
      throw error;
    }
  }

  /**
   * Crea un nuevo entrenador (asesor)
   * Endpoint: POST /api/v1/admin-panel/create-adviser
   */
  static async createEntrenador(data: CreateEntrenadorDto): Promise<Entrenador> {
    if (!data.firstName || !data.lastName || !data.email || !data.username) {
      throw new Error("Nombre, apellido, email y username son requeridos");
    }

    try {
      console.log("📝 EntrenadoresService: Creando nuevo entrenador:", data.firstName, data.lastName);

      const response = await this.makeRequest<ApiResponse<Entrenador>>("/api/v1/admin-panel/create-adviser", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          password: data.password || "AsesorPass123!", // Contraseña por defecto si no se provee
        }),
      });

      console.log("✅ EntrenadoresService: Entrenador creado exitosamente");
      return response.data;
    } catch (error) {
      console.error("Error creando entrenador:", error);
      throw error;
    }
  }

  /**
   * Actualiza un entrenador existente
   * Endpoint: PUT /api/v1/coaches/{id}
   */
  static async updateEntrenador(id: string, data: Partial<UpdateEntrenadorDto>): Promise<Entrenador> {
    if (!id) {
      throw new Error("ID de entrenador requerido");
    }

    try {
      console.log("📝 EntrenadoresService: Actualizando entrenador:", id);

      const response = await this.makeRequest<ApiResponse<Entrenador>>(`/api/v1/coaches/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });

      console.log("✅ EntrenadoresService: Entrenador actualizado exitosamente");
      return response.data;
    } catch (error) {
      console.error("Error actualizando entrenador:", error);
      throw error;
    }
  }

  /**
   * Elimina un entrenador
   * Endpoint: DELETE /api/v1/admin-panel/coaches?coach_id={id}
   */
  static async deleteEntrenador(id: string): Promise<void> {
    if (!id) {
      throw new Error("ID de entrenador requerido");
    }

    try {
      console.log("🗑️ EntrenadoresService: Eliminando entrenador:", id);

      await this.makeRequest<{ success: boolean; message: string }>(`/api/v1/admin-panel/coaches?coach_id=${id}`, {
        method: "DELETE",
      });

      console.log("✅ EntrenadoresService: Entrenador eliminado exitosamente");
    } catch (error) {
      console.error("Error eliminando entrenador:", error);
      throw error;
    }
  }

  /**
   * Activa o desactiva a un empleado.
   * Endpoint: PUT /api/v1/admin-panel/coaches/status  →  { coach_id, status_login }
   *
   * Antes llamaba a `PATCH /api/v1/coaches/{id}/status`, que NO EXISTE: el
   * backend respondía «Cannot PATCH /api/v1/coaches/…/status» (404) y
   * desactivar a alguien no hacía nada. La ruta buena está en el módulo
   * admin-panel, es PUT, lleva el id en el cuerpo y el estado como número
   * (1 = activo, 0 = inactivo), que es lo que guarda `user.status_login`.
   *
   * El `coach_id` es el id de USUARIO. En la lista de coaches el backend
   * devuelve el mismo valor en `id` y en `user_id`, así que sirven los dos.
   *
   * Devuelve solo un mensaje, no el empleado: quien llama refresca la lista.
   */
  static async toggleEntrenadorStatus(
    id: string,
    status: "Activo" | "Inactivo" | "Vacaciones" | "Pendiente",
  ): Promise<{ message: string }> {
    if (!id) {
      throw new Error("ID de empleado requerido");
    }

    try {
      console.log("🔄 EntrenadoresService: Cambiando estado del empleado:", id, "a", status);

      const response = await this.makeRequest<{ message: string }>("/api/v1/admin-panel/coaches/status", {
        method: "PUT",
        body: JSON.stringify({ coach_id: id, status_login: status === "Activo" ? 1 : 0 }),
      });

      console.log("✅ EntrenadoresService: Estado del empleado actualizado");
      return response;
    } catch (error) {
      console.error("Error cambiando estado del empleado:", error);
      throw error;
    }
  }

  /**
   * Asigna un cliente a un entrenador
   * Endpoint: POST /api/v1/coaches/{coachId}/clients/{clientId}
   */
  static async assignClientToEntrenador(coachId: string, clientId: string): Promise<void> {
    if (!coachId || !clientId) {
      throw new Error("IDs de entrenador y cliente requeridos");
    }

    try {
      console.log("👥 EntrenadoresService: Asignando cliente", clientId, "al entrenador", coachId);

      await this.makeRequest<{ success: boolean; message: string }>(`/api/v1/coaches/${coachId}/clients/${clientId}`, {
        method: "POST",
      });

      console.log("✅ EntrenadoresService: Cliente asignado exitosamente");
    } catch (error) {
      console.error("Error asignando cliente:", error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de un entrenador
   * Endpoint: GET /api/v1/coaches/{id}/stats
   */
  static async getEntrenadorStats(id: string): Promise<{
    totalClients: number;
    activeClients: number;
    completedSessions: number;
    rating: number;
    reviewsCount: number;
  }> {
    if (!id) {
      throw new Error("ID de entrenador requerido");
    }

    try {
      const response = await this.makeRequest<ApiResponse<any>>(`/api/v1/coaches/${id}/stats`);
      return response.data;
    } catch (error) {
      console.error("Error obteniendo estadísticas del entrenador:", error);
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
