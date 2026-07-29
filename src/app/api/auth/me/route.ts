import { NextResponse } from "next/server";

import { isTokenValid, decodeToken } from "@/lib/auth/jwt-utils";
import { getAuthTokenFromCookies } from "@/lib/auth/server-utils";

export async function GET() {
  try {
    const token = await getAuthTokenFromCookies();

    if (!token || !isTokenValid(token)) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const user = decodeToken(token);

    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // Devolver información segura del usuario
    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        role: user.role,
        // El nombre va porque es lo que se pinta en el menú y en Perfil; sin
        // esto el panel saludaba con el email. Sigue sin salir `sub` ni `iat`,
        // que es lo que este endpoint quería mantener fuera.
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    console.error("Error obteniendo usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
