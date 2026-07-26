import { cookies } from "next/headers";

// Utilidades para manejo de cookies HttpOnly (SOLO SERVIDOR)
// Este archivo solo debe ser importado en Server Components o API Routes

export const getAuthTokenFromCookies = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  return cookieStore.get("authToken")?.value ?? null;
};

export const setAuthTokenInCookies = async (token: string): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.set("authToken", token, {
    httpOnly: true,
    // En producción la cookie es Secure (solo HTTPS). El build de revisión de la
    // LAN se sirve por HTTP, así que ahí Secure haría que el navegador la
    // descarte y el guard rebotara al login: se desactiva con
    // ALLOW_INSECURE_COOKIES=true (solo para ese build; el prod real de Vercel
    // no la define, así que mantiene Secure).
    secure: process.env.NODE_ENV === "production" && process.env.ALLOW_INSECURE_COOKIES !== "true",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 30, // 30 días (antes 1 hora; el JWT dura 90d)
    path: "/",
  });
};

export const removeAuthTokenFromCookies = async (): Promise<void> => {
  const cookieStore = await cookies();
  cookieStore.delete("authToken");
};
