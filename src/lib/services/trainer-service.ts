/* eslint-disable max-lines */
/**
 * Servicio para manejar todas las operaciones relacionadas con Trainer
 * Conectado al backend según ANALISIS_FUNCIONALIDADES_BACKEND.md
 * Solo usa endpoints que existen en el backend
 */

import { getAuthToken } from "@/lib/auth/auth-utils";
import { API_BASE_URL } from "@/lib/services/api-base";

import { CalculatorService } from "./calculator-service";
import { ChatTasksService } from "./chat-tasks.service";
import type {
  TrainerTask,
  CreateTrainerTaskDto,
  GetTasksFilters,
  TrainerMetrics,
  TrainerCliente,
  GetClientesParams,
  AdviceResponse,
  Advice,
  IMCHistoryRecord,
  TasksResponse,
} from "./trainer-types";

// ============================================================================
// CONFIGURACIÓN DEL SERVICIO
// ============================================================================

const REQUEST_TIMEOUT = 10000;

// ============================================================================
// SERVICIO DE TRAINER
// ============================================================================

/**
 * Servicio para manejar todas las operaciones relacionadas con Trainer
 */
export class TrainerService {
  // ==========================================================================
  // MÉTODOS PRIVADOS
  // ==========================================================================

  /**
   * Configurar headers por defecto con token de autenticación
   */
  private static getDefaultHeaders(token: string | null): Record<string, string> {
    const defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    } else if (typeof window !== "undefined") {
      // Fallback a localStorage
      try {
        const fallbackToken = localStorage.getItem("authToken");
        if (fallbackToken) {
          defaultHeaders.Authorization = `Bearer ${fallbackToken}`;
        }
      } catch (error) {
        console.warn("Error accessing localStorage:", error);
      }
    }

    return defaultHeaders;
  }

  /**
   * Manejar errores de respuesta HTTP
   */
  private static async handleResponseError(response: Response): Promise<never> {
    let errorData: unknown = {};
    try {
      const text = await response.text();
      errorData = text ? JSON.parse(text) : {};
    } catch {
      errorData = {};
    }

    // Manejar errores de autenticación
    if (response.status === 401 || response.status === 403) {
      console.warn("🔐 TrainerService: Token de autenticación inválido o expirado");
      throw new Error("Unauthorized");
    }

    // Manejar error 404
    if (response.status === 404) {
      console.error(`❌ TrainerService: Endpoint no encontrado (404): ${response.url}`);
      throw new Error(`Endpoint no encontrado: ${response.url}`);
    }

    const errorMessage =
      (errorData as { message?: string }).message ??
      (errorData as { error?: string }).error ??
      `Error ${response.status}: ${response.statusText}`;

    throw new Error(errorMessage);
  }

  /**
   * Manejar errores de conexión
   * @deprecated Este método ya no se usa, el manejo de errores se hace directamente en makeRequest
   */
  private static handleRequestError(error: unknown, timeoutId: NodeJS.Timeout): never {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Tiempo de espera agotado. Por favor, intenta nuevamente.");
    }

    console.error("❌ TrainerService: Error en petición:", error);
    throw new Error("Error de conexión con el servidor");
  }

  /**
   * Método privado para realizar peticiones HTTP al backend
   */
  private static async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken();
    const url = `${API_BASE_URL}${endpoint}`;

    console.log("💪 TrainerService: Haciendo petición a:", url);
    console.log("🔑 TrainerService: Token disponible:", !!token);

    const defaultHeaders = this.getDefaultHeaders(token);

    // Crear controlador de abort para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("📥 TrainerService: Respuesta status:", response.status);

      if (!response.ok) {
        await this.handleResponseError(response);
      }

      const data = await response.json();
      console.log("✅ TrainerService: Datos recibidos");

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Tiempo de espera agotado. Por favor, intenta nuevamente.");
      }
      console.error("❌ TrainerService: Error en petición:", error);
      throw new Error("Error de conexión con el servidor");
    }
  }

  // ==========================================================================
  // MÉTODOS PÚBLICOS - TAREAS
  // ==========================================================================

  /**
   * Obtiene todas las tareas asignadas al trainer actual
   * Endpoint: GET /api/v1/admin-panel/tasks/assigned-to-me
   */
  static async getTareasAsignadas(filters?: GetTasksFilters): Promise<TrainerTask[]> {
    try {
      console.log("💪 TrainerService: Obteniendo tareas asignadas...");

      const queryParams = new URLSearchParams();
      if (filters?.status) {
        queryParams.append("status", filters.status);
      }
      if (filters?.priority) {
        queryParams.append("priority", filters.priority);
      }
      if (filters?.limit) {
        queryParams.append("limit", filters.limit.toString());
      }
      if (filters?.offset) {
        queryParams.append("offset", filters.offset.toString());
      }

      const queryString = queryParams.toString();
      const endpoint = `/api/v1/admin-panel/tasks/assigned-to-me${queryString ? `?${queryString}` : ""}`;

      // Usar ChatTasksService que ya tiene la implementación
      const response = await ChatTasksService.getMyTasks({
        status: filters?.status,
        priority: filters?.priority,
      });

      // Mapear a TrainerTask
      const tasks: TrainerTask[] = response.map((task) => ({
        id: task.id,
        chat_id: task.chat_id,
        support_ticket_id: task.support_ticket_id,
        title: task.title,
        description: task.description,
        assigned_to: task.assigned_to,
        created_by: task.created_by,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        completed_at: task.completed_at,
        created_at: task.created_at,
        updated_at: task.updated_at,
        assigned_to_user: task.assigned_to_user,
        created_by_user: task.created_by_user,
      }));

      console.log(`✅ TrainerService: ${tasks.length} tareas obtenidas`);
      return tasks;
    } catch (error) {
      console.error("❌ TrainerService: Error obteniendo tareas:", error);
      throw error;
    }
  }

  /**
   * Obtiene las tareas de un cliente específico
   * Endpoint: GET /api/v1/admin-panel/chat/:chatId/tasks
   */
  static async getTareasPorCliente(chatId: string): Promise<TrainerTask[]> {
    try {
      console.log("💪 TrainerService: Obteniendo tareas del cliente:", chatId);

      const response = await ChatTasksService.getTasksByChat(chatId);

      // Mapear a TrainerTask
      const tasks: TrainerTask[] = response.map((task) => ({
        id: task.id,
        chat_id: task.chat_id,
        support_ticket_id: task.support_ticket_id,
        title: task.title,
        description: task.description,
        assigned_to: task.assigned_to,
        created_by: task.created_by,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        completed_at: task.completed_at,
        created_at: task.created_at,
        updated_at: task.updated_at,
        assigned_to_user: task.assigned_to_user,
        created_by_user: task.created_by_user,
      }));

      console.log(`✅ TrainerService: ${tasks.length} tareas del cliente obtenidas`);
      return tasks;
    } catch (error) {
      console.error("❌ TrainerService: Error obteniendo tareas del cliente:", error);
      throw error;
    }
  }

  /**
   * Crea una nueva tarea para un cliente
   * Endpoint: POST /api/v1/admin-panel/chat/:chatId/tasks
   */
  static async crearTarea(chatId: string, data: CreateTrainerTaskDto): Promise<TrainerTask> {
    try {
      console.log("💪 TrainerService: Creando tarea para cliente:", chatId);

      const response = await ChatTasksService.createTask(chatId, {
        title: data.title,
        description: data.description,
        assigned_to: data.assigned_to,
        priority: data.priority,
        due_date: data.due_date,
      });

      // Mapear a TrainerTask
      const task: TrainerTask = {
        id: response.id,
        chat_id: response.chat_id,
        support_ticket_id: response.support_ticket_id,
        title: response.title,
        description: response.description,
        assigned_to: response.assigned_to,
        created_by: response.created_by,
        status: response.status,
        priority: response.priority,
        due_date: response.due_date,
        completed_at: response.completed_at,
        created_at: response.created_at,
        updated_at: response.updated_at,
        assigned_to_user: response.assigned_to_user,
        created_by_user: response.created_by_user,
      };

      console.log("✅ TrainerService: Tarea creada exitosamente");
      return task;
    } catch (error) {
      console.error("❌ TrainerService: Error creando tarea:", error);
      throw error;
    }
  }

  /**
   * Actualiza el estado de una tarea
   * Endpoint: PUT /api/v1/admin-panel/tasks/:taskId/status
   */
  static async actualizarEstadoTarea(
    taskId: string,
    status: "pending" | "in_progress" | "completed" | "cancelled",
  ): Promise<TrainerTask> {
    try {
      console.log("💪 TrainerService: Actualizando estado de tarea:", taskId, "a", status);

      const response = await ChatTasksService.updateTaskStatus(taskId, status);

      // Mapear a TrainerTask
      const task: TrainerTask = {
        id: response.id,
        chat_id: response.chat_id,
        support_ticket_id: response.support_ticket_id,
        title: response.title,
        description: response.description,
        assigned_to: response.assigned_to,
        created_by: response.created_by,
        status: response.status,
        priority: response.priority,
        due_date: response.due_date,
        completed_at: response.completed_at,
        created_at: response.created_at,
        updated_at: response.updated_at,
        assigned_to_user: response.assigned_to_user,
        created_by_user: response.created_by_user,
      };

      console.log("✅ TrainerService: Estado de tarea actualizado");
      return task;
    } catch (error) {
      console.error("❌ TrainerService: Error actualizando estado de tarea:", error);
      throw error;
    }
  }

  // ==========================================================================
  // MÉTODOS PÚBLICOS - CLIENTES/ASESORÍAS
  // ==========================================================================

  /**
   * Obtiene los clientes activos del trainer (a través de asesorías)
   * Endpoint: GET /api/v1/admin-panel/advices
   */
  static async getClientesActivos(params?: GetClientesParams): Promise<TrainerCliente[]> {
    try {
      console.log("💪 TrainerService: Obteniendo clientes activos...");

      const page = params?.page !== undefined && typeof params.page === "number" && params.page > 0 ? params.page : 1;
      const limit =
        params?.limit !== undefined && typeof params.limit === "number" && params.limit > 0 ? params.limit : 1000;

      const queryParams = new URLSearchParams();
      queryParams.append("page", page.toString());
      queryParams.append("limit", limit.toString());

      const queryString = queryParams.toString();
      const endpoint = `/api/v1/admin-panel/advices${queryString ? `?${queryString}` : ""}`;

      const response = await this.makeRequest<AdviceResponse>(endpoint, {
        method: "GET",
      });

      // Mapear Advice a TrainerCliente
      const clientes: TrainerCliente[] = response.advices
        .filter((advice) => {
          // Filtrar solo asesorías de tipo "Entrenamiento" o "Completo"
          const tipo = advice.advice_type?.toLowerCase() ?? "";
          return tipo.includes("entrenamiento") || tipo.includes("completo");
        })
        .map((advice: Advice) => ({
          id: advice.user_id,
          nombre: `${advice.user?.firstName ?? ""} ${advice.user?.lastName ?? ""}`.trim() || "Sin nombre",
          email: advice.user?.email ?? "",
          avatar: advice.user?.avatar,
          advice_id: advice.id,
          advice_type: advice.advice_type as "Entrenamiento" | "Nutricional" | "Completo",
          coach_id: advice.coach_id,
          coach_name: advice.coach ? `${advice.coach.firstName} ${advice.coach.lastName}`.trim() : undefined,
          start_date: advice.start_date,
          end_date: advice.end_date,
          status: advice.status === "active" ? "active" : advice.status === "inactive" ? "inactive" : "pending",
        }));

      console.log(`✅ TrainerService: ${clientes.length} clientes activos obtenidos`);
      return clientes;
    } catch (error) {
      console.error("❌ TrainerService: Error obteniendo clientes:", error);
      throw error;
    }
  }

  // ==========================================================================
  // MÉTODOS PÚBLICOS - IMC
  // ==========================================================================

  /**
   * Obtiene el historial de IMC de un usuario
   * Endpoint: GET /api/v1/calculator/history
   */
  static async getHistorialIMC(date?: string): Promise<IMCHistoryRecord[]> {
    try {
      console.log("💪 TrainerService: Obteniendo historial de IMC...");
      return await CalculatorService.getIMCHistory(date);
    } catch (error) {
      console.error("❌ TrainerService: Error obteniendo historial de IMC:", error);
      throw error;
    }
  }

  /**
   * Calcula el IMC actual del usuario
   * Endpoint: POST /api/v1/calculator/imc
   */
  static async calcularIMC(weight: number, height: number): Promise<IMCHistoryRecord> {
    try {
      console.log("💪 TrainerService: Calculando IMC...");
      const response = await CalculatorService.calculateIMC({ weight, height });

      // Mapear respuesta a IMCHistoryRecord
      return {
        id: "", // El backend no devuelve ID en el cálculo
        user_id: "", // Se obtiene del token
        weight: response.weight,
        height: response.height,
        imc: response.imc,
        classification: response.classification,
        tips: response.tips,
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ TrainerService: Error calculando IMC:", error);
      throw error;
    }
  }

  // ==========================================================================
  // MÉTODOS PÚBLICOS - UTILIDADES
  // ==========================================================================

  /**
   * Calcula métricas agregadas de tareas
   */
  static calcularMetricasTareas(tareas: TrainerTask[]): TrainerMetrics {
    const ahora = new Date();

    // Métricas básicas
    const totalTareas = tareas.length;
    const tareasPendientes = tareas.filter((t) => t.status === "pending").length;
    const tareasEnProgreso = tareas.filter((t) => t.status === "in_progress").length;
    const tareasCompletadas = tareas.filter((t) => t.status === "completed").length;
    const tareasCanceladas = tareas.filter((t) => t.status === "cancelled").length;
    const porcentajeCompletadas = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;

    // Métricas por prioridad
    const tareasUrgentes = tareas.filter((t) => t.priority === "urgent").length;
    const tareasAltas = tareas.filter((t) => t.priority === "high").length;
    const tareasMedias = tareas.filter((t) => t.priority === "medium").length;
    const tareasBajas = tareas.filter((t) => t.priority === "low").length;

    // Métricas temporales
    const tareasVencidas = tareas.filter((t) => {
      if (!t.due_date || t.status === "completed" || t.status === "cancelled") return false;
      const fechaVencimiento = new Date(t.due_date);
      return fechaVencimiento < ahora;
    }).length;

    const sieteDias = new Date(ahora);
    sieteDias.setDate(sieteDias.getDate() + 7);
    const tareasProximasVencer = tareas.filter((t) => {
      if (!t.due_date || t.status === "completed" || t.status === "cancelled") return false;
      const fechaVencimiento = new Date(t.due_date);
      return fechaVencimiento >= ahora && fechaVencimiento <= sieteDias;
    }).length;

    return {
      totalTareas,
      tareasPendientes,
      tareasEnProgreso,
      tareasCompletadas,
      tareasCanceladas,
      porcentajeCompletadas,
      totalClientes: 0, // Se calcula por separado
      clientesActivos: 0, // Se calcula por separado
      clientesInactivos: 0, // Se calcula por separado
      tareasUrgentes,
      tareasAltas,
      tareasMedias,
      tareasBajas,
      tareasVencidas,
      tareasProximasVencer,
    };
  }
}
