/**
 * Servicio para manejar operaciones relacionadas con asesorías
 * Endpoint: /api/v1/admin-panel/advices
 * Sigue el patrón de CalculatorService y CursosService
 */

import { getAuthToken } from "@/lib/auth/auth-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

import type { AdvicesResponse, GetAdvicesParams } from "./advices-types";

// ============================================================================
// CONFIGURACIÓN DEL SERVICIO
// ============================================================================

const REQUEST_TIMEOUT = 10000;

// ============================================================================
// SERVICIO DE ASESORÍAS
// ============================================================================

/**
 * Servicio para manejar todas las operaciones relacionadas con asesorías
 */
export class AdvicesService {
  // ==========================================================================
  // MÉTODOS PRIVADOS
  // ==========================================================================

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
   * Crear una instancia de AbortController con timeout
   */
  private static createAbortController(timeout: number = REQUEST_TIMEOUT): AbortController {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller;
  }

  /**
   * Manejar errores HTTP
   */
  private static async handleHttpError(response: Response): Promise<never> {
    let errorMessage = `Error ${response.status}: ${response.statusText}`;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // Si no se puede parsear el error, usar el mensaje por defecto
    }

    throw new Error(errorMessage);
  }

  // ==========================================================================
  // MÉTODOS PÚBLICOS - LECTURA
  // ==========================================================================

  /**
   * Obtener todas las asesorías con paginación
   * Endpoint: GET /api/v1/admin-panel/advices
   *
   * @param params - Parámetros de paginación (limit, page)
   * @returns Lista paginada de asesorías
   * @throws Error si falla la petición
   */
  static async getAdvices(params?: GetAdvicesParams): Promise<AdvicesResponse> {
    try {
      const token = getAuthToken();
      const headers = this.getDefaultHeaders(token);
      const controller = this.createAbortController();

      // Construir query params
      const queryParams = new URLSearchParams();
      queryParams.append("limit", (params?.limit ?? 20).toString());
      queryParams.append("page", (params?.page ?? 1).toString());

      const url = `${API_BASE_URL}/api/v1/admin-panel/advices?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("La petición ha excedido el tiempo límite");
        }
        throw error;
      }
      throw new Error("Error desconocido al obtener las asesorías");
    }
  }
}
