"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";

import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { setAuthTokenInStorage, removeAuthTokenFromStorage, getAuthTokenFromStorage } from "@/lib/auth/cookie-utils";
import { User } from "@/lib/auth/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * A dónde ir tras entrar: la pantalla de la que te echó el 401 (`?redirect=`)
 * o el panel.
 *
 * Solo se acepta una ruta INTERNA. Un `?redirect=https://otra-cosa` convertiría
 * el login del back office en un trampolín para mandar a alguien del equipo a
 * una web ajena que se le parezca — con `//` basta para saltar de dominio, así
 * que no vale con comprobar la barra inicial.
 */
function destinoTrasEntrar(): string {
  if (typeof window === "undefined") return "/dashboard";
  const destino = new URLSearchParams(window.location.search).get("redirect");
  if (!destino || !destino.startsWith("/") || destino.startsWith("//")) return "/dashboard";
  return destino;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Error de autenticación");
      }

      // Guardar token en localStorage y contexto
      if (data.token) {
        setAuthTokenInStorage(data.token);
        setToken(data.token);
        console.log("✅ Token guardado en localStorage y contexto");
      }

      // El token se guarda automáticamente en cookies HttpOnly
      await refreshUser();
      toast.success("Inicio de sesión exitoso");

      // De vuelta a donde estaba antes de que la sesión se cayera, si el rebote
      // dejó la pantalla en `?redirect=`. Si no, al panel, como siempre.
      router.push(destinoTrasEntrar());
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error en logout API:", errorData);
      }
    } catch (error) {
      console.error("Error en logout:", error);
    } finally {
      // Limpiar token de localStorage y contexto
      removeAuthTokenFromStorage();
      setToken(null);
      setUser(null);
      router.push("/auth/v1/login");
    }
  };

  const refreshUser = async () => {
    try {
      const response = await fetch("/api/auth/me");

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error refrescando usuario:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar token desde localStorage al inicializar
    const storedToken = getAuthTokenFromStorage();
    if (storedToken) {
      setToken(storedToken);
    }
    refreshUser();
  }, []);

  const contextValue = useMemo(() => ({ user, token, loading, login, logout, refreshUser }), [user, token, loading]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
