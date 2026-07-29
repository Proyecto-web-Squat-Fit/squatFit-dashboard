// Tipos de autenticación
export interface AuthToken {
  exp: number;
  iat: number;
  sub: string;
  email: string;
  role: string;
  // El token que emite /admin-panel/login trae también estos. No estaban
  // declarados, así que el panel enseñaba el email donde tocaba el nombre.
  firstName?: string;
  lastName?: string;
  status?: string;
}

export interface User {
  email: string;
  role: string;
  // Opcionales: un token viejo, emitido antes de que /api/auth/me los
  // devolviera, no los trae. Quien los pinte tiene que aguantar que falten.
  firstName?: string;
  lastName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    email: string;
  };
}

export interface ApiError {
  error: string;
  status?: number;
}
