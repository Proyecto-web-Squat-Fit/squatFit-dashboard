import { NextResponse } from "next/server";

import { getAuthTokenFromCookies } from "@/lib/auth/server-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

/**
 * Proxy para GET /api/v1/admin-panel/total-sales
 * Lee el token desde la cookie HttpOnly en el servidor y lo reenvía al backend
 */
export async function GET() {
  try {
    const token = await getAuthTokenFromCookies();

    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/admin-panel/total-sales`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ error: errorData.message ?? `Error ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en proxy total-sales:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
