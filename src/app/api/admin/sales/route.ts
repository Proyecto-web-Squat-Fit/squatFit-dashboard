import { type NextRequest, NextResponse } from "next/server";

import { getAuthTokenFromCookies } from "@/lib/auth/server-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

/**
 * Proxy para GET /api/v1/admin-panel/sales
 * Soporta query params: page, limit, month, search
 * Lee el token desde la cookie HttpOnly en el servidor
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getAuthTokenFromCookies();

    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Reenviar los query params al backend
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") ?? "1";
    const limit = searchParams.get("limit") ?? "20";
    const month = searchParams.get("month");
    const search = searchParams.get("search");
    const userId = searchParams.get("user_id");

    const params = new URLSearchParams({ page, limit });
    if (month) params.append("month", month);
    if (search) params.append("search", search);
    // Se reenvía solo cuando el cliente lo envía (gobernado por SALES_BY_USER_READY
    // en el front). El backend lo ignorará hasta que soporte el filtro por usuario.
    if (userId) params.append("user_id", userId);

    const response = await fetch(`${API_BASE_URL}/api/v1/admin-panel/sales?${params.toString()}`, {
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
    console.error("Error en proxy sales:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
