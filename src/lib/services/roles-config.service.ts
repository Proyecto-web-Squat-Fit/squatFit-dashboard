import { getAuthToken } from "@/lib/auth/auth-utils";
import { API_BASE_URL as API_BASE_URL_COMPARTIDO } from "@/lib/services/api-base";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface RoleConfig {
  id: string;
  name: string;
  can_receive_websocket_notifications?: boolean;
  websocket_role_identifier?: string | null;
}

export interface RoleMapping {
  realRole: string; // El rol real del backend (adviser, dietitian, etc)
  uiRole: "coach" | "dietitian" | "support"; // El rol mapeado para UI/WebSocket
}

// ============================================================================
// SERVICIO DE CONFIGURACIÓN DE ROLES
// ============================================================================

/**
 * Servicio para obtener la configuración de roles dinámicamente desde el backend
 */
class RolesConfigService {
  private rolesCache: RoleConfig[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly API_BASE_URL = API_BASE_URL_COMPARTIDO;

  /**
   * Obtiene los roles desde el backend (con caché)
   */
  async getRoles(): Promise<RoleConfig[]> {
    // Si hay caché válido, retornarlo
    if (this.rolesCache && Date.now() < this.cacheExpiry) {
      console.log("📦 RolesConfig: Usando roles desde caché");
      return this.rolesCache;
    }

    try {
      console.log("🔄 RolesConfig: Obteniendo roles desde backend...");

      const token = getAuthToken();
      const response = await fetch(`${this.API_BASE_URL}/api/v1/admin-panel/roles/websocket-config`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const roles: RoleConfig[] = data.data ?? data ?? [];
      this.rolesCache = roles;
      this.cacheExpiry = Date.now() + this.CACHE_TTL;

      console.log("✅ RolesConfig: Roles obtenidos:", this.rolesCache);
      return roles;
    } catch (error) {
      console.error("❌ RolesConfig: Error obteniendo roles:", error);

      // Fallback: usar roles mínimos hardcodeados solo como último recurso
      console.warn("⚠️ RolesConfig: Usando roles fallback");
      return this.getFallbackRoles();
    }
  }

  /**
   * Obtiene el mapeo de un rol específico
   */
  async getRoleMapping(realRole: string): Promise<RoleMapping> {
    const roles = await this.getRoles();

    // Mapeo basado en websocket_role_identifier si existe
    const roleConfig = roles.find((r) => r.name.toLowerCase() === realRole.toLowerCase());

    if (roleConfig?.websocket_role_identifier) {
      const uiRole = this.normalizeWebSocketRole(roleConfig.websocket_role_identifier);
      return {
        realRole: roleConfig.name,
        uiRole,
      };
    }

    // Fallback: usar mapeo por defecto
    return {
      realRole,
      uiRole: this.getDefaultUIRole(realRole),
    };
  }

  /**
   * Normaliza el websocket_role_identifier a un tipo válido de UI
   */
  private normalizeWebSocketRole(identifier: string): "coach" | "dietitian" | "support" {
    const normalized = identifier.toLowerCase();

    if (normalized.includes("coach") || normalized === "adviser") return "coach";
    if (normalized.includes("dietitian")) return "dietitian";
    if (normalized.includes("support")) return "support";

    return "coach"; // Default
  }

  /**
   * Obtiene el rol de UI por defecto para un rol real
   */
  private getDefaultUIRole(realRole: string): "coach" | "dietitian" | "support" {
    const normalized = realRole.toLowerCase();

    if (normalized === "adviser" || normalized === "admin") return "coach";
    if (normalized === "dietitian") return "dietitian";
    if (normalized === "support_agent") return "support";

    return "coach"; // Default
  }

  /**
   * Roles fallback en caso de error al obtener desde el backend
   */
  private getFallbackRoles(): RoleConfig[] {
    console.warn("🔴 RolesConfig: Usando roles fallback hardcodeados - esto NO debería ocurrir en producción");
    return [
      {
        id: "cd6e4ce1-ad96-4a1d-b6ed-c646aab053a1",
        name: "adviser",
        can_receive_websocket_notifications: true,
        websocket_role_identifier: "adviser",
      },
      {
        id: "360f955b-1576-4172-8112-68e286949054",
        name: "dietitian",
        can_receive_websocket_notifications: true,
        websocket_role_identifier: "dietitian",
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "support_agent",
        can_receive_websocket_notifications: true,
        websocket_role_identifier: "support",
      },
    ];
  }

  /**
   * Limpia el caché (útil para testing o cuando se detectan cambios)
   */
  clearCache(): void {
    this.rolesCache = null;
    this.cacheExpiry = 0;
    console.log("🗑️ RolesConfig: Caché limpiado");
  }
}

// ============================================================================
// INSTANCIA SINGLETON
// ============================================================================

export const rolesConfigService = new RolesConfigService();
