"use client";
/* eslint-disable max-lines */

import React, { useState, useEffect, useMemo } from "react";

import clsx from "clsx";
import { jwtDecode } from "jwt-decode";
import {
  ChevronRight,
  Circle,
  Clock,
  MessageSquare,
  Users,
  TrendingUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import AddCollaboratorModal from "@/components/chat/AddCollaboratorModal";
import CreateTaskModal from "@/components/chat/CreateTaskModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useChat } from "@/contexts/chat-context";
import { getAuthToken } from "@/lib/auth/auth-utils";
import { ChatCompleteService } from "@/lib/services/chat-complete.service";
import { ChatParticipantsService, type ChatParticipant } from "@/lib/services/chat-participants.service";
import { getInitials, formatMessageTime, getRoleDisplayName } from "@/lib/services/chat-service";
import { chatTasksService, type Task } from "@/lib/services/chat-tasks.service";

/**
 * Componente DetailItem - Elemento de detalle en la ficha técnica
 */
interface DetailItemProps {
  label: string;
  value: string | number;
  interactive?: boolean;
  icon?: React.ReactNode;
  action?: string;
  onClick?: () => void;
}

const DetailItem: React.FC<DetailItemProps> = ({ label, value, interactive, icon, action, onClick }) => (
  <div
    className={clsx("flex items-center justify-between py-3 transition-colors duration-150", {
      "hover:bg-muted cursor-pointer dark:hover:bg-gray-800": interactive ?? action,
    })}
    onClick={onClick}
  >
    <span className="text-muted-foreground dark:text-muted-foreground text-sm">{label}</span>
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-foreground text-sm font-semibold dark:text-gray-100">{value}</span>
      {interactive && <ChevronRight size={16} className="text-muted-foreground" />}
      {action && <button className="text-sm text-[#FF690B] hover:underline">{action}</button>}
    </div>
  </div>
);

/**
 * Componente FichaTecnica - Panel de información del usuario
 *
 * Este componente muestra información detallada del usuario seleccionado
 * y estadísticas del chat.
 *
 * Características:
 * - Información del usuario
 * - Estadísticas del chat
 * - Acciones principales y secundarias
 * - Estados de carga y error
 */
export default function FichaTecnica() {
  const { selectedConversation, stats, error, loadConversations } = useChat();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [completingChat, setCompletingChat] = useState(false);
  const [reassigningTicket, setReassigningTicket] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [showReassignConfirm, setShowReassignConfirm] = useState(false);
  const [pendingReassignData, setPendingReassignData] = useState<{
    newProfessionalId: string;
    isTicket: boolean;
    isComplete?: boolean;
  } | null>(null);

  /**
   * Carga los participantes del chat seleccionado
   */
  const loadParticipants = async (forceRefresh = false) => {
    if (!selectedConversation) return;

    setLoadingParticipants(true);
    try {
      const data = await ChatParticipantsService.getChatParticipants(selectedConversation.id, forceRefresh);
      setParticipants(data);
    } catch (error) {
      console.error("Error cargando participantes:", error);
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  };

  /**
   * Carga las tareas del chat seleccionado
   */
  const loadTasks = async () => {
    if (!selectedConversation) return;

    setLoadingTasks(true);
    try {
      const data = await chatTasksService.getTasksByChat(selectedConversation.id);
      setTasks(data);
    } catch (error) {
      console.error("Error cargando tareas:", error);
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  /**
   * Actualiza el estado de una tarea
   */
  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task["status"]) => {
    try {
      await chatTasksService.updateTaskStatus(taskId, newStatus);
      await loadTasks(); // Recargar tareas
    } catch (error) {
      console.error("Error actualizando estado de tarea:", error);
      alert("Error al actualizar el estado de la tarea");
    }
  };

  /**
   * Verifica si la conversación es un ticket de soporte
   */
  const isSupportTicket = useMemo(() => {
    // Un ticket de soporte tiene al menos un participante con rol support_agent y is_representative: true
    return participants.some((p) => p.participant?.role_name === "support_agent" && p.is_representative);
  }, [participants]);

  /**
   * Reasigna el ticket de soporte a otro agente
   */
  const handleReassignTicket = async (newAgentId: string) => {
    if (!selectedConversation) return;

    // Mostrar confirmación inline
    setPendingReassignData({ newProfessionalId: newAgentId, isTicket: true });
    setShowReassignConfirm(true);
  };

  /**
   * Ejecuta la reasignación del ticket después de la confirmación
   */
  const executeReassignTicket = async () => {
    if (!selectedConversation || !pendingReassignData) return;

    setReassigningTicket(true);
    setShowReassignConfirm(false);
    try {
      await ChatParticipantsService.reassignTicket(selectedConversation.id, {
        agent_id: pendingReassignData.newProfessionalId,
      });

      toast.success("Ticket reasignado exitosamente");

      // Recargar participantes y conversaciones
      await loadParticipants(true); // Forzar refresh después de agregar colaborador
      await loadConversations();
      setIsReassignModalOpen(false);
      // Disparar evento personalizado para notificar a Conversation
      window.dispatchEvent(
        new CustomEvent("participantAdded", {
          detail: { chatId: selectedConversation.id },
        }),
      );
    } catch (error: any) {
      console.error("Error reasignando ticket:", error);
      toast.error(`âŒ Error al reasignar ticket: ${error.message ?? "Error desconocido"}`);
    } finally {
      setReassigningTicket(false);
      setPendingReassignData(null);
    }
  };

  /**
   * Reasigna el chat normal a otro profesional
   */
  const handleReassignChat = async (newProfessionalId: string) => {
    if (!selectedConversation) return;

    // Mostrar confirmación inline
    setPendingReassignData({ newProfessionalId, isTicket: false });
    setShowReassignConfirm(true);
  };

  /**
   * Ejecuta la reasignación del chat después de la confirmación
   */
  const executeReassignChat = async () => {
    if (!selectedConversation || !pendingReassignData) return;

    setReassigningTicket(true); // Reutilizar el mismo estado de carga
    setShowReassignConfirm(false);
    try {
      await ChatParticipantsService.reassignChat(selectedConversation.id, {
        professional_id: pendingReassignData.newProfessionalId,
      });

      toast.success("Chat reasignado exitosamente");

      // Recargar participantes y conversaciones
      await loadParticipants(true); // Forzar refresh después de agregar colaborador
      await loadConversations();
      setIsReassignModalOpen(false);
      // Disparar evento personalizado para notificar a Conversation
      window.dispatchEvent(
        new CustomEvent("participantAdded", {
          detail: { chatId: selectedConversation.id },
        }),
      );
    } catch (error: any) {
      console.error("Error reasignando chat:", error);
      toast.error(`âŒ Error al reasignar chat: ${error.message ?? "Error desconocido"}`);
    } finally {
      setReassigningTicket(false);
      setPendingReassignData(null);
    }
  };

  /**
   * Marca el chat actual como completado
   */
  const handleCompleteChat = async () => {
    console.log("ðŸ”µ [COMPLETE_CHAT] handleCompleteChat llamado");
    console.log("ðŸ”µ [COMPLETE_CHAT] selectedConversation:", selectedConversation);

    if (!selectedConversation) {
      console.warn("âš ï¸ [COMPLETE_CHAT] No hay conversaciÃ³n seleccionada");
      return;
    }

    // Mostrar confirmación con AlertDialog
    setPendingReassignData({ newProfessionalId: "", isTicket: false, isComplete: true });
    setShowReassignConfirm(true);
  };

  /**
   * Ejecuta la acción de completar chat después de la confirmación
   */
  const executeCompleteChat = async () => {
    if (!selectedConversation) return;

    setCompletingChat(true);
    setShowReassignConfirm(false);
    const chatIdToComplete = selectedConversation.id;
    const userName = selectedConversation.name;

    console.log("🔔 [COMPLETE_CHAT] Iniciando proceso de completar chat:", {
      chatId: chatIdToComplete,
      userName,
      professionalId: selectedConversation.professionalId,
    });

    try {
      console.log("🔔 [COMPLETE_CHAT] Llamando a ChatCompleteService.completeChat...");
      await ChatCompleteService.completeChat(chatIdToComplete);
      console.log("✅ [COMPLETE_CHAT] Chat completado exitosamente");

      // Mostrar mensaje de éxito con toast
      toast.success(
        `✅ Chat completado exitosamente.\n\nSe ha enviado un mensaje de despedida a ${userName} vía Telegram.`,
      );

      // Recargar la lista de conversaciones para actualizar la UI
      if (loadConversations) {
        await loadConversations();
      }
    } catch (error: unknown) {
      console.error("Error completando chat:", error);
      toast.error(`❌ Error al completar el chat:\n\n${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally {
      setCompletingChat(false);
      setPendingReassignData(null);
    }
  };

  /**
   * Obtener el ID del usuario actual desde el JWT
   */
  const getCurrentUserId = (): string | null => {
    try {
      const token = getAuthToken();
      if (token) {
        const decoded = jwtDecode<{ sub?: string; id?: string; role?: string }>(token);
        return (decoded.sub as string) ?? (decoded.id as string);
      }
    } catch (error) {
      console.error("Error obteniendo usuario actual:", error);
    }
    return null;
  };

  /**
   * Verificar si el usuario actual es el profesional principal del chat o admin
   * También verifica si es el agente asignado en tickets de soporte
   */
  const isMainProfessional = useMemo(() => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) return false;

    // Verificar rol del usuario actual primero
    try {
      const token = getAuthToken();
      if (token) {
        const decoded = jwtDecode<{ sub?: string; id?: string; role?: string }>(token);

        // Permitir si es admin
        if (decoded.role === "admin") return true;

        // Para tickets de soporte, verificar si es el agente asignado
        if (isSupportTicket) {
          // Buscar si el usuario actual es el agente representante (principal)
          const isAssignedAgent = participants.some(
            (p) =>
              p.participant_id === currentUserId && p.participant?.role_name === "support_agent" && p.is_representative,
          );

          // Si no hay agente asignado, cualquier support_agent puede completarlo
          // (el backend validará esto)
          if (decoded.role === "support_agent") {
            return true; // El backend validará si puede completarlo
          }

          return isAssignedAgent;
        }

        // Para otros roles, verificar si es el profesional asignado
        if (!selectedConversation?.professionalId) return false;

        // Permitir si es el profesional asignado
        if (selectedConversation.professionalId === currentUserId) return true;
      }
    } catch (error) {
      console.error("Error verificando rol:", error);
    }

    return false;
  }, [selectedConversation, participants, isSupportTicket]);

  /**
   * Cargar participantes y tareas cuando cambia la conversación seleccionada
   * Con debounce para evitar peticiones múltiples
   */
  useEffect(() => {
    if (!selectedConversation) {
      setParticipants([]);
      setTasks([]);
      return;
    }

    let isMounted = true;
    const timeoutId: NodeJS.Timeout = setTimeout(() => {
      if (isMounted) {
        void loadParticipants();
        void loadTasks();
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [selectedConversation]);

  // Renderizar estado sin conversación seleccionada
  if (!selectedConversation) {
    return (
      <div className="bg-muted/50 flex h-full items-center justify-center rounded-lg p-4 dark:bg-gray-900/20">
        <div className="text-center">
          <div className="text-muted-foreground mb-4">
            <Users size={48} />
          </div>
          <p className="text-muted-foreground dark:text-muted-foreground text-sm">
            Selecciona una conversación para ver detalles
          </p>
        </div>
      </div>
    );
  }

  // Obtener iniciales del usuario
  const initials = getInitials(selectedConversation.name);

  // Calcular tiempo desde último mensaje
  const getLastActivity = () => {
    if (!selectedConversation.lastMessage) return "Sin actividad";

    const lastMessageTime = new Date(selectedConversation.lastMessage.created_at);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastMessageTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Ahora";
    if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)}h`;
    return `Hace ${Math.floor(diffInMinutes / 1440)}d`;
  };

  // Obtener el nombre del colaborador principal
  const getMainCollaboratorName = (): string => {
    if (loadingParticipants) return "Cargando...";
    const activeParticipants = participants.filter((p) => p.is_active);
    if (activeParticipants.length === 0) return "Sin asignar";
    if (activeParticipants.length === 1) {
      const p = activeParticipants[0].participant;
      return p ? `${p.firstName} ${p.lastName}` : "Sin nombre";
    }
    return `${activeParticipants.length} colaboradores`;
  };

  // Función para obtener el color de una etiqueta
  const getTagColor = (tag: string) => {
    switch (tag.toLowerCase()) {
      case "nutrition":
      case "nutrición":
        return "bg-[#e4f0ea] text-[#2f855a] dark:bg-green-900/30 dark:text-[#2f855a]";
      case "training":
      case "entrenamiento":
        return "bg-[#e7e6ff] text-[#363C98] dark:bg-blue-900/30 dark:text-[#363C98]";
      case "emotional":
      case "emocional":
        return "bg-[#e8d8de] text-[#9f4e63] dark:bg-purple-900/30 dark:text-[#9f4e63]";
      case "support":
      case "soporte":
        return "bg-[#FFF0E7] text-[#FF690B] dark:bg-orange-900/30 dark:text-[#FF690B]";
      case "sales":
      case "ventas":
        return "bg-[#FFF0E7] text-[#FF690B] dark:bg-yellow-900/30 dark:text-[#FF690B]";
      default:
        return "bg-muted text-foreground dark:bg-gray-800 dark:text-muted-foreground";
    }
  };

  // Datos de la ficha técnica
  const fichaData = {
    initials,
    name: selectedConversation.name,
    tags: selectedConversation.tags,
    details: [
      {
        label: "Estado",
        value: selectedConversation.isActive ? "Activo" : "Inactivo",
        icon: (
          <Circle
            size={14}
            className={clsx("fill-current", selectedConversation.isActive ? "text-[#2f855a]" : "text-muted-foreground")}
          />
        ),
      },
      {
        label: "Mensajes no leídos",
        value: selectedConversation.unread.toString(),
        icon: <MessageSquare size={14} className="text-[#363C98]" />,
      },
      {
        label: "Última actividad",
        value: getLastActivity(),
        icon: <Clock size={14} className="text-muted-foreground" />,
      },
      {
        label: "Colaboradores",
        value: getMainCollaboratorName(),
        interactive: true,
        onClick: () => setIsModalOpen(true),
      },
    ],
    mainActions: [
      "Añadir colaborador",
      ...(isSupportTicket ? ["Reasignar ticket"] : ["Reasignar chat"]),
      "Marcar como completado",
    ],
    // secondaryActions: ["Asignar rutina", "Actualizar estado", "Agregar nota"], // Comentadas temporalmente
    secondaryActions: [],
  };

  return (
    <div className="bg-muted/50 flex h-full flex-col gap-6 rounded-lg p-4 dark:bg-gray-900/20">
      <h2 className="text-primary text-lg font-bold">Ficha Técnica</h2>

      {/* Información del Usuario */}
      <div className="flex flex-col items-center gap-2 text-center">
        <Avatar className="from-[#FFF7F2]0 h-20 w-20 bg-gradient-to-br to-[#9f4e63]">
          <AvatarFallback className="bg-transparent text-2xl font-bold text-white">{fichaData.initials}</AvatarFallback>
        </Avatar>
        <p className="text-foreground text-lg font-bold dark:text-gray-100">{fichaData.name}</p>
        {/* Etiquetas como badges */}
        {fichaData.tags && fichaData.tags.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-1">
            {fichaData.tags.map((tag: string, index: number) => (
              <span key={index} className={`rounded-full px-2 py-0.5 text-xs font-medium ${getTagColor(tag)}`}>
                {tag}
              </span>
            ))}
          </div>
        ) : (
          // ✅ Mostrar rol del profesional si es professional_professional, sino "Sin etiquetas"
          <p className="text-muted-foreground dark:text-muted-foreground text-sm">
            {selectedConversation.chat_type === "professional_professional" && selectedConversation.professionalRole
              ? `Rol: ${getRoleDisplayName(selectedConversation.professionalRole)}`
              : "Sin etiquetas"}
          </p>
        )}

        {/* Indicador de estado */}
        <div className="flex items-center gap-1 text-xs">
          <Circle
            size={8}
            className={clsx("fill-current", selectedConversation.isActive ? "text-[#2f855a]" : "text-muted-foreground")}
          />
          <span
            className={clsx(
              "font-medium",
              selectedConversation.isActive
                ? "text-[#2f855a] dark:text-[#2f855a]"
                : "text-muted-foreground dark:text-muted-foreground",
            )}
          >
            {selectedConversation.isActive ? "En línea" : "Desconectado"}
          </span>
        </div>
      </div>

      {/* Detalles */}
      <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-700">
        {fichaData.details.map((item) => (
          <DetailItem key={item.label} {...item} onClick={item.onClick ?? (() => {})} />
        ))}
      </div>

      {/* Tareas */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold dark:text-gray-300">
            <Circle size={16} />
            Tareas
          </h3>
          <Button variant="ghost" size="sm" onClick={() => setIsCreateTaskModalOpen(true)} className="h-7 px-2 text-xs">
            <Plus size={14} className="mr-1" />
            Crear
          </Button>
        </div>
        {loadingTasks ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={16} className="text-muted-foreground animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="border-border text-muted-foreground dark:text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm dark:border-gray-700">
            No hay tareas asignadas
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => {
              const getStatusIcon = () => {
                switch (task.status) {
                  case "completed":
                    return <CheckCircle2 size={14} className="text-[#2f855a]" />;
                  case "in_progress":
                    return <Circle size={14} className="text-[#363C98]" />;
                  case "cancelled":
                    return <XCircle size={14} className="text-[#9f4e63]" />;
                  default:
                    return <AlertCircle size={14} className="text-[#FF690B]" />;
                }
              };

              const getPriorityColor = () => {
                switch (task.priority) {
                  case "urgent":
                    return "text-[#9f4e63] dark:text-[#9f4e63]";
                  case "high":
                    return "text-[#FF690B] dark:text-[#FF690B]";
                  case "medium":
                    return "text-[#FF690B] dark:text-[#FF690B]";
                  default:
                    return "text-foreground dark:text-muted-foreground";
                }
              };

              return (
                <div
                  key={task.id}
                  className="border-border rounded-lg border bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon()}
                        <span className="text-foreground text-sm font-semibold dark:text-gray-100">{task.title}</span>
                      </div>
                      {task.description && (
                        <p className="text-foreground dark:text-muted-foreground mt-1 text-xs">{task.description}</p>
                      )}
                      <div className="text-muted-foreground dark:text-muted-foreground mt-2 flex items-center gap-3 text-xs">
                        <span className={getPriorityColor()}>
                          {task.priority === "urgent"
                            ? "Urgente"
                            : task.priority === "high"
                              ? "Alta"
                              : task.priority === "medium"
                                ? "Media"
                                : "Baja"}
                        </span>
                        {task.assigned_to_user && (
                          <span>
                            Asignada a: {task.assigned_to_user.firstName} {task.assigned_to_user.lastName}
                          </span>
                        )}
                      </div>
                    </div>
                    {task.status !== "completed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateTaskStatus(task.id, "completed")}
                        className="ml-2 h-6 px-2 text-xs"
                      >
                        Completar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Estadísticas del Chat */}
      {stats && (
        <div className="flex flex-col gap-3">
          <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold dark:text-gray-300">
            <TrendingUp size={16} />
            Estadísticas
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#e7e6ff] p-3 dark:bg-blue-900/30">
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-[#363C98] dark:text-[#363C98]" />
                <div>
                  <p className="text-lg font-bold text-[#363C98] dark:text-[#363C98]">{stats.totalConversations}</p>
                  <p className="text-xs text-[#363C98] dark:text-[#363C98]">Conversaciones</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-[#e4f0ea] p-3 dark:bg-green-900/30">
              <div className="flex items-center gap-2">
                <Circle size={14} className="text-[#2f855a] dark:text-[#2f855a]" />
                <div>
                  <p className="text-lg font-bold text-[#2f855a] dark:text-[#2f855a]">{stats.unreadMessages}</p>
                  <p className="text-xs text-[#2f855a] dark:text-[#2f855a]">No leídos</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-[#e8d8de] p-3 dark:bg-purple-900/30">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-[#9f4e63] dark:text-[#9f4e63]" />
                <div>
                  <p className="text-lg font-bold text-[#9f4e63] dark:text-[#9f4e63]">{stats.activeConversations}</p>
                  <p className="text-xs text-[#9f4e63] dark:text-[#9f4e63]">Activas</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-[#FFF0E7] p-3 dark:bg-orange-900/30">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#FF690B] dark:text-[#FF690B]" />
                <div>
                  <p className="text-lg font-bold text-[#FF690B] dark:text-[#FF690B]">{stats.messagesToday}</p>
                  <p className="text-xs text-[#FF690B] dark:text-[#FF690B]">Hoy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Acciones Principales */}
      <div className="flex flex-col gap-3">
        {fichaData.mainActions.map((action) => {
          const isCompleteButton = action === "Marcar como completado";
          const isAddCollaborator = action === "Añadir colaborador";
          const isReassignTicket = action === "Reasignar ticket";
          const isReassignChat = action === "Reasignar chat";

          // Ocultar botÃ³n de completar si no es el profesional principal
          if (isCompleteButton && !isMainProfessional) {
            console.log("âš ï¸ [BUTTON] BotÃ³n de completar oculto - isMainProfessional:", isMainProfessional);
            return null;
          }

          // Ocultar botón de completar si el chat/ticket ya está cerrado
          if (isCompleteButton) {
            // Verificar estado del chat/ticket
            // Para tickets, verificar si hay un participante support_agent con is_representative
            // y si el status del ticket es 'closed'
            const isAlreadyClosed = isSupportTicket
              ? participants.some((p) => p.participant?.role_name === "support_agent" && p.is_representative) &&
                (selectedConversation as unknown as Record<string, unknown>)?.status === "closed"
              : (selectedConversation as unknown as Record<string, unknown>)?.status === "completed";

            if (isAlreadyClosed) {
              console.log("⚠️ [BUTTON] Botón de completar oculto - chat/ticket ya está cerrado");
              return null;
            }
          }

          // Log para depuración del botón de completar
          if (isCompleteButton) {
            console.log("✅ [BUTTON] Botón de completar renderizado - isMainProfessional:", isMainProfessional);
          }

          return (
            <Button
              key={action}
              variant="ghost"
              onClick={() => {
                console.log("🔔 [BUTTON] onClick disparado para:", action);
                if (isAddCollaborator) {
                  setIsModalOpen(true);
                } else if (isReassignTicket || isReassignChat) {
                  setIsReassignModalOpen(true);
                } else if (isCompleteButton) {
                  console.log("🔔 [BUTTON] Ejecutando handleCompleteChat");
                  handleCompleteChat();
                }
              }}
              disabled={
                (completingChat && isCompleteButton) || (reassigningTicket && (isReassignTicket || isReassignChat))
              }
              className="w-full justify-center bg-[#FF690B]/20 text-[#FF690B] hover:bg-[#FF690B]/30 hover:text-[#FF690B] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#FF690B]/20 dark:text-[#FF690B] dark:hover:bg-[#FF690B]/30"
            >
              {completingChat && isCompleteButton ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completando...
                </>
              ) : reassigningTicket && (isReassignTicket || isReassignChat) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reasignando...
                </>
              ) : (
                action
              )}
            </Button>
          );
        })}
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="rounded-lg bg-[#e8d8de] p-3 dark:bg-red-900/20">
          <p className="text-sm text-[#9f4e63] dark:text-[#9f4e63]">Error cargando información</p>
        </div>
      )}

      {/* Modal para Agregar Colaboradores */}
      <AddCollaboratorModal
        chatId={selectedConversation.id}
        currentParticipants={participants}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadParticipants(true); // Forzar refresh después de agregar colaborador
          setIsModalOpen(false);
          // Disparar evento personalizado para notificar a Conversation
          window.dispatchEvent(
            new CustomEvent("participantAdded", {
              detail: { chatId: selectedConversation.id },
            }),
          );
        }}
      />

      {/* Modal para Reasignar Ticket o Chat */}
      <AddCollaboratorModal
        chatId={selectedConversation.id}
        currentParticipants={participants}
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        onSuccess={(newProfessionalId) => {
          if (newProfessionalId) {
            if (isSupportTicket) {
              handleReassignTicket(newProfessionalId);
            } else {
              handleReassignChat(newProfessionalId);
            }
          } else {
            setIsReassignModalOpen(false);
          }
        }}
        mode="reassign"
      />

      {/* Modal para Crear Tarea */}
      <CreateTaskModal
        chatId={selectedConversation.id}
        isOpen={isCreateTaskModalOpen}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onSuccess={() => {
          loadTasks();
        }}
      />

      {/* AlertDialog para confirmación de reasignación y completar chat */}
      <AlertDialog open={showReassignConfirm} onOpenChange={setShowReassignConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingReassignData?.isComplete
                ? "Marcar como Completado"
                : pendingReassignData?.isTicket
                  ? "Reasignar Ticket"
                  : "Reasignar Chat"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingReassignData?.isComplete
                ? `¿Estás seguro de que deseas marcar esta conversación con ${selectedConversation.name} como completada?\n\nEsto cerrará el chat activo y enviará un mensaje de despedida al usuario vía Telegram.`
                : pendingReassignData?.isTicket
                  ? "¿Estás seguro de que deseas reasignar este ticket a otro agente?\n\nEl agente actual se convertirá en colaborador y el nuevo agente será el principal."
                  : "¿Estás seguro de que deseas reasignar este chat a otro profesional?\n\nEl profesional actual se convertirá en colaborador y el nuevo profesional será el principal."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingReassignData(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingReassignData?.isComplete) {
                  executeCompleteChat();
                } else if (pendingReassignData?.isTicket) {
                  executeReassignTicket();
                } else {
                  executeReassignChat();
                }
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
