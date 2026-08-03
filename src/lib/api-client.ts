import axios from "axios";

import { API_BASE_URL } from "@/lib/services/api-base";

// Configuración del cliente HTTP
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT ?? "10000"),
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para agregar token automáticamente
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Cierra la sesión ante un 401 (token expirado/inválido) y manda al login.
 * Reutilizable desde los servicios que usan `fetch` crudo (leads, orders,
 * products, notifications) para que un 401 no se pinte como «no hay datos».
 */
export const handleUnauthorized = (): void => {
  removeAuthToken();
  if (typeof window !== "undefined") {
    window.location.href = "/auth/v1/login";
  }
};

// Interceptor para manejar errores de autenticación y rate limiting
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      handleUnauthorized();
    } else if (error.response?.status === 429) {
      // Rate limiting
      console.warn("Rate limiting detectado. Esperando antes de reintentar...");
      // Podríamos implementar retry logic aquí
    }
    return Promise.reject(error);
  },
);

// Utilidades para manejo de tokens
export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
};

export const setAuthToken = (token: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem("authToken", token);
};

export const removeAuthToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("authToken");
};

// Tipos para las respuestas del API según documentación Swagger
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  // Nota: El backend puede no devolver user en la respuesta
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
  message?: string;
}

export interface ApiError {
  message: string;
  status: number;
  timestamp?: string;
  path?: string;
}

// Funciones específicas del API según documentación Swagger
export const authAPI = {
  // Login - Endpoint: POST /api/v1/admin-panel/login
  // ✅ CONFIRMADO: Este endpoint funciona
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post("/api/v1/admin-panel/login", {
      email,
      password,
    });
    return response.data;
  },

  // Obtener usuario actual - Endpoint: GET /api/v1/admin-panel/me
  // ❌ NO DISPONIBLE: Este endpoint no existe en el backend
  getCurrentUser: async (): Promise<LoginResponse["user"]> => {
    throw new Error("Endpoint de usuario actual no disponible en el backend actual");
  },

  // Logout - Endpoint: POST /api/v1/admin-panel/logout
  // ❓ NO CONFIRMADO: Este endpoint puede no existir
  logout: async (): Promise<void> => {
    try {
      await apiClient.post("/api/v1/admin-panel/logout");
    } catch {
      // Ignorar errores en logout
      console.warn("Endpoint de logout no disponible, limpiando token localmente");
    } finally {
      removeAuthToken();
    }
  },

  // Health check - Endpoint: GET /api/v1/health
  // ❌ NO DISPONIBLE: Este endpoint no existe
  healthCheck: async (): Promise<unknown> => {
    throw new Error("Endpoint de health check no disponible en el backend actual");
  },
};

export default apiClient;
