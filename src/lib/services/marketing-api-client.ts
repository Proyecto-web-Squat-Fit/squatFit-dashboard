import type { FiltrosMarketing } from "@/app/(main)/dashboard/marketing/_components/schema";
import { getAuthToken } from "@/lib/auth/auth-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

// ============================================================================
// CONFIGURACIÓN DEL SERVICIO
// ============================================================================

// Se importa Y se reexporta: marketing-service.ts lo consume desde aquí desde
// antes de que existiera el módulo común, y este fichero lo usa además en su
// propio código, que un `export … from` suelto no cubre.
export { API_BASE_URL };
const REQUEST_TIMEOUT = 10000;

// ============================================================================
// CLIENTE API BASE PARA MARKETING
// ============================================================================

/**
 * Cliente HTTP base para el servicio de Marketing
 */
export class MarketingApiClient {
  /**
   * Configurar headers por defecto con token de autenticación
   */
  static getDefaultHeaders(token: string | null): Record<string, string> {
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
   * Método para realizar peticiones HTTP al backend
   */
  static async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken();
    const url = `${API_BASE_URL}${endpoint}`;

    console.log("🌐 MarketingService: Haciendo petición a:", url);

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

  /**
   * Construir query string desde filtros
   */
  static buildQueryString(filtros?: FiltrosMarketing): string {
    if (!filtros) return "";

    const params = new URLSearchParams();

    if (filtros.fechaInicio) params.append("fecha_inicio", filtros.fechaInicio);
    if (filtros.fechaFin) params.append("fecha_fin", filtros.fechaFin);
    if (filtros.tipoProducto && filtros.tipoProducto !== "todos") {
      params.append("tipo_producto", filtros.tipoProducto);
    }
    if (filtros.coachId) params.append("coach_id", filtros.coachId);
    if (filtros.estadoCliente && filtros.estadoCliente !== "todos") {
      params.append("estado_cliente", filtros.estadoCliente);
    }

    const queryString = params.toString();
    return queryString ? `?${queryString}` : "";
  }
}
