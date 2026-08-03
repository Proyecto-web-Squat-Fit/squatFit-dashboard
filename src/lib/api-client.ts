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

/** Un 401 puede llegar por varias peticiones a la vez; se cierra sesión UNA. */
let cerrandoSesion = false;

/**
 * Cierra la sesión ante un 401 (token expirado/inválido) y manda al login.
 * Reutilizable desde los servicios que usan `fetch` crudo (leads, orders,
 * products, notifications) para que un 401 no se pinte como «no hay datos».
 *
 * OJO CON LA COOKIE. El token vive en DOS sitios: `localStorage` (lo lee el
 * cliente para la cabecera Authorization) y una cookie `authToken` **httpOnly**
 * (la lee el middleware para dejarte entrar en `/dashboard`). Esto borraba solo
 * el de localStorage — y una cookie httpOnly NO se puede borrar desde
 * JavaScript, por definición. La cookie se quedaba, con su JWT de 90 días sin
 * caducar, así que:
 *
 *   401 → «cierro sesión» → /auth/v1/login → el servidor ve la cookie y te
 *   considera autenticado → te devuelve a /dashboard → 401 → …
 *
 * Nunca llegabas al formulario. El panel se quedaba con todos los datos en
 * «Error al cargar» y la única salida real era borrar las cookies a mano. Por
 * eso ahora se llama a `/api/auth/logout`, que es la ÚNICA vía que puede
 * borrarla (corre en el servidor) y que además avisa al backend.
 *
 * La navegación va en `finally`: si la llamada de logout falla (justo el caso
 * en que el backend no responde), hay que ir al login igualmente.
 */
export const handleUnauthorized = (): void => {
  if (typeof window === "undefined") return;
  if (cerrandoSesion) return;
  cerrandoSesion = true;

  removeAuthToken();

  // Se conserva dónde estaba la persona para devolverla ahí tras entrar. El
  // propio login usa este parámetro para saber que llega REBOTADA y no
  // mandarla de vuelta al panel (ver la página de login).
  const vueltaA = `${window.location.pathname}${window.location.search}`;
  const destino = vueltaA.startsWith("/auth")
    ? "/auth/v1/login"
    : `/auth/v1/login?redirect=${encodeURIComponent(vueltaA)}`;

  void fetch("/api/auth/logout", { method: "POST" })
    .catch(() => {
      // Da igual por qué falle: lo importante es no dejar a nadie encerrado.
    })
    .finally(() => {
      // `replace` y no `href`: la pantalla que acaba de dar 401 no debe quedar
      // en el historial, o el botón «atrás» vuelve a meterte en el bucle.
      window.location.replace(destino);
    });
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
