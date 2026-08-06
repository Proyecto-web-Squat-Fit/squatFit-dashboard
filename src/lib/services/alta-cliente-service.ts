import { getAuthToken } from "@/lib/auth/auth-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

// ============================================================================
// DAR DE ALTA A UN CLIENTE QUE YA PAGÓ
// ----------------------------------------------------------------------------
// `POST /api/v1/admin-panel/users/create-client` (backend PR #196/#197,
// desplegado el 6-ago-2026).
//
// Para qué es: quien paga por un enlace de pago de Stripe no recibe nada. Esos
// enlaces no llevan metadata, así que el webhook no sabe qué conceder y cae en
// `reportUnmappedCheckout`: no crea cuenta, no concede, y avisa a la campana de
// que «hay que darle el alta y el acceso a mano». Esto es ese alta.
//
// EL CORREO VA APAGADO POR DEFECTO, y no es un descuido. Dar de alta a alguien y
// que le llegue un «Crea tu contraseña» que no esperaba es peor que no mandarlo:
// el orden natural es alta → concederle lo que pagó → avisarle. Y no se queda
// tirado mientras tanto, porque con la cuenta creada ya puede entrar en
// squadfit.es/login, escribir su email y recibir el enlace él solo.
//
// Es idempotente: si el email ya tiene cuenta devuelve la suya y no toca nada.
// ============================================================================
export const CREATE_CLIENT_ENDPOINT = "/api/v1/admin-panel/users/create-client";

export interface AltaClientePayload {
  email: string;
  firstName?: string;
  lastName?: string;
  /** Mandarle ya el correo de «Crea tu contraseña». Por defecto no. */
  sendActivation?: boolean;
}

export interface AltaClienteResult {
  created: boolean;
  already_existed: boolean;
  user_id: string;
  email: string;
  has_password: boolean;
  message: string;
}

export class AltaClienteService {
  static async crear(payload: AltaClientePayload): Promise<AltaClienteResult> {
    const token = getAuthToken() ?? (typeof window !== "undefined" ? localStorage.getItem("authToken") : null);

    const res = await fetch(`${API_BASE_URL}${CREATE_CLIENT_ENDPOINT}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // Los campos opcionales solo viajan si tienen valor: el DTO del backend
      // usa `forbidNonWhitelisted`, y mandar `undefined` serializado o campos
      // vacíos es la clase de detalle que devuelve un 400 sin decir por qué.
      body: JSON.stringify({
        email: payload.email.trim().toLowerCase(),
        ...(payload.firstName?.trim() ? { firstName: payload.firstName.trim() } : {}),
        ...(payload.lastName?.trim() ? { lastName: payload.lastName.trim() } : {}),
        ...(payload.sendActivation ? { send_activation: true } : {}),
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(body.message ?? body.error ?? `Error ${res.status} al dar de alta al cliente`);
    }
    return body as AltaClienteResult;
  }
}
