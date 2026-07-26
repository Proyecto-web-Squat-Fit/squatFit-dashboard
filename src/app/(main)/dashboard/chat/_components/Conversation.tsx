"use client";
/* eslint-disable max-lines */

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

import clsx from "clsx";
import {
  MoreHorizontal,
  Paperclip,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Search,
  X,
  Reply,
  AlertCircle,
  User,
  UserCircle,
} from "lucide-react";

import SavedResponsesPanel from "@/components/chat/SavedResponsesPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "@/contexts/chat-context";
import { getAuthTokenFromClient, getAuthTokenFromStorage } from "@/lib/auth/cookie-utils";
import { decodeToken } from "@/lib/auth/jwt-utils";
import { formatMessageTime, isRecentMessage, ChatService, getRoleDisplayName } from "@/lib/services/chat-service";
import { type SavedResponse } from "@/lib/services/saved-responses.service";

// Componente MessageInput separado para evitar re-renders
const MessageInput = React.memo(
  ({
    selectedConversation,
    sendMessage,
    loading,
    isConnected,
    inputRef,
    markAsRead,
    replyingTo,
    onCancelReply,
    isCurrentUserParticipant,
    participantCheckError,
  }: {
    selectedConversation: any;
    sendMessage: any;
    loading: boolean;
    isConnected: boolean;
    inputRef: React.RefObject<HTMLInputElement>;
    markAsRead?: () => Promise<void>;
    replyingTo?: any;
    onCancelReply?: () => void;
    isCurrentUserParticipant?: boolean | null;
    participantCheckError?: string | null;
  }) => {
    const [messageText, setMessageText] = useState("");
    const [, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleSendMessage = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim() || !selectedConversation || loading) return;

        const content = messageText.trim();
        setMessageText("");
        setIsTyping(false);

        try {
          const replyToMessageId = replyingTo?.id;
          await sendMessage(content, "text", replyToMessageId);
          if (onCancelReply) onCancelReply();
        } catch (error) {
          console.error("Error enviando mensaje:", error);
        }
      },
      [messageText, selectedConversation, loading, sendMessage, replyingTo, onCancelReply],
    );

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setMessageText(value);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      const hasContent = value.trim().length > 0;
      typingTimeoutRef.current = setTimeout(() => setIsTyping(hasContent), 300);
    }, []);

    const handleKeyPress = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSendMessage(e);
        }
      },
      [handleSendMessage],
    );

    // âœ… PRIORIDAD 2: Marcar como leÃ­do al hacer foco en el input (fallback)
    // NOTA: Este handler solo se ejecuta si el useEffect no marcÃ³ los mensajes
    // El debounce en markAsRead evitarÃ¡ llamadas duplicadas
    const handleInputFocus = useCallback(() => {
      // Solo marcar si hay mensajes no leÃ­dos
      // El debounce interno de markAsRead evitarÃ¡ llamadas duplicadas
      if (selectedConversation && selectedConversation.unread > 0 && markAsRead) {
        console.log("ðŸ“ MessageInput: Foco en input - intentando marcar como leÃ­do (fallback)");
        // Usar setTimeout para dar prioridad al useEffect si se ejecuta al mismo tiempo
        setTimeout(() => {
          markAsRead();
        }, 100);
      }
    }, [selectedConversation, markAsRead]);

    useEffect(
      () => () => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      },
      [],
    );

    const isInputDisabled = loading || !isConnected || isCurrentUserParticipant === false;

    return (
      <div className="border-t">
        {replyingTo && (
          <div className="bg-muted flex items-center justify-between px-4 py-2 dark:bg-gray-800">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Reply className="text-muted-foreground h-4 w-4" />
                <span className="text-foreground text-xs font-semibold dark:text-gray-300">Respondiendo a:</span>
              </div>
              <p className="text-foreground dark:text-muted-foreground ml-6 truncate text-xs">
                {replyingTo.content?.substring(0, 50)}
                {replyingTo.content && replyingTo.content.length > 50 ? "..." : ""}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onCancelReply} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {participantCheckError && (
          <div className="mx-4 my-2 border-l-4 border-yellow-400 bg-yellow-50 p-3 dark:border-yellow-500 dark:bg-yellow-900/20">
            <div className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 flex-shrink-0 text-[#FF690B]" />
              <p className="text-sm text-[#FF690B] dark:text-[#FF690B]">{participantCheckError}</p>
            </div>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-4">
          <Button type="button" variant="ghost" size="icon" className="h-10 w-10" disabled={isInputDisabled}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            ref={inputRef}
            value={messageText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onFocus={handleInputFocus}
            placeholder={replyingTo ? "Escribe tu respuesta..." : "Escribe un mensaje..."}
            className="flex-1"
            disabled={isInputDisabled}
          />
          <Button
            type="submit"
            size="icon"
            className="bg-primary h-10 w-10 rounded-full"
            disabled={!messageText.trim() || loading || !isConnected || isCurrentUserParticipant === false}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    );
  },
);

MessageInput.displayName = "MessageInput";

// Componente Conversation - Muestra conversación seleccionada y permite enviar mensajes
// Función para generar un color consistente basado en un ID
const generateColorFromId = (id: string): string => {
  if (!id) return "bg-gray-400";

  // Generar hash simple del ID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Paleta de colores profesionales (evitando gris y naranja que ya usamos)
  const colors = [
    "bg-[#363C98]",
    "bg-[#9f4e63]",
    "bg-[#2f855a]",
    "bg-indigo-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-violet-500",
    "bg-fuchsia-500",
    "bg-[#2f855a]",
  ];

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export default function Conversation() {
  const { selectedConversation, messages, sendMessage, loading, error, isConnected, markAsRead } = useChat();

  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isSavedResponsesPanelOpen, setIsSavedResponsesPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [isCurrentUserParticipant, setIsCurrentUserParticipant] = useState<boolean | null>(null);
  const [participantCheckError, setParticipantCheckError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const isLongMessage = (content: string): boolean => {
    if (!content || typeof content !== "string") return false;
    return content.length > 200 || content.split("\n").length > 3;
  };

  const currentUserId = useMemo(() => {
    try {
      let token = getAuthTokenFromClient();
      token ??= getAuthTokenFromStorage();
      if (token) {
        const decoded = decodeToken(token);
        if (decoded) {
          console.log("ðŸ‘¤ [Conversation] Usuario actual detectado:", {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role,
          });
          return decoded.sub ?? null;
        }
      }
    } catch (error) {
      console.error("Error obteniendo ID del usuario:", error);
    }
    return null;
  }, []);

  const currentUserRole = useMemo(() => {
    try {
      let token = getAuthTokenFromClient();
      token ??= getAuthTokenFromStorage();
      if (token) {
        const decoded = decodeToken(token);
        return decoded?.role ?? null;
      }
    } catch (error) {
      console.error("Error obteniendo rol del usuario:", error);
    }
    return null;
  }, []);

  // Cargar participantes del chat con debounce
  useEffect(() => {
    if (!selectedConversation) {
      setParticipants([]);
      return;
    }

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const loadParticipants = async (forceRefresh = false) => {
      try {
        const { ChatParticipantsService } = await import("@/lib/services/chat-participants.service");
        const data = await ChatParticipantsService.getChatParticipants(selectedConversation.id, forceRefresh);
        if (isMounted) {
          setParticipants(data);
        }
      } catch (error) {
        console.error("Error cargando participantes:", error);
        if (isMounted) {
          setParticipants([]);
        }
      }
    };

    // Debounce: esperar 100ms antes de cargar para evitar peticiones múltiples
    const loadTimeout = setTimeout(() => {
      loadParticipants();
    }, 100);

    // Escuchar evento personalizado cuando se agrega un colaborador
    const handleParticipantAdded = (event: CustomEvent) => {
      if (event.detail?.chatId === selectedConversation.id) {
        console.log("🔄 [Conversation] Participante agregado, recargando lista...");
        clearTimeout(loadTimeout);
        loadParticipants(true); // Forzar refresh
      }
    };

    window.addEventListener("participantAdded" as unknown as string, handleParticipantAdded as EventListener);

    return () => {
      isMounted = false;
      clearTimeout(loadTimeout);
      window.removeEventListener("participantAdded" as unknown as string, handleParticipantAdded as EventListener);
    };
  }, [selectedConversation]);

  // Verificar si el usuario actual es participante del chat (solo para admin)
  useEffect(() => {
    const checkParticipantStatus = () => {
      if (!selectedConversation || !currentUserId || currentUserRole !== "admin") {
        setIsCurrentUserParticipant(null);
        setParticipantCheckError(null);
        return;
      }

      // Usar los participantes cargados para verificar
      const isParticipant = participants.some((p) => p.participant_id === currentUserId && p.is_active);
      setIsCurrentUserParticipant(isParticipant);

      if (!isParticipant) {
        setParticipantCheckError(
          "Debes ser un participante del chat para poder enviar mensajes. Puedes agregarte como colaborador desde la ficha técnica.",
        );
      } else {
        setParticipantCheckError(null);
      }
    };

    checkParticipantStatus();
  }, [selectedConversation, currentUserId, currentUserRole, participants]);

  const scrollToBottom = useCallback((force: boolean = false) => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

      // Solo hacer scroll automático si está cerca del final o si se fuerza
      if (isNearBottom || force) {
        setTimeout(
          () => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: force ? "auto" : "smooth" });
            } else if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
          },
          force ? 0 : 100,
        );
      }
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        setShowScrollButton(distanceFromBottom >= 100);
      }
    }, 100);
  }, []);

  // Scroll automático cuando cambian los mensajes o la conversación
  useEffect(() => {
    if (messages.length > 0) {
      // Scroll suave cuando hay mensajes nuevos
      scrollToBottom(false);
    }
    if (selectedConversation && inputRef.current) {
      inputRef.current.focus();
    }
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [messages.length, selectedConversation?.id, scrollToBottom]);

  // Scroll forzado cuando se carga una nueva conversación
  useEffect(() => {
    if (selectedConversation) {
      // Forzar scroll al final cuando se cambia de conversación
      setTimeout(() => scrollToBottom(true), 200);
    }
  }, [selectedConversation?.id, scrollToBottom]);

  const processedMessages = useMemo(() => {
    if (!messages.length) return [];

    const mainUserId = selectedConversation?.user_id; // Usuario principal (Telegram)

    console.log("ðŸ” [Conversation] Procesando mensajes:", {
      total: messages.length,
      currentUserId,
      mainUserId,
      primerMensaje: messages[0]
        ? {
            id: messages[0].id,
            sender_id: (messages[0] as any).sender_id,
            content: messages[0].content?.substring(0, 30),
          }
        : null,
    });

    return messages.map((message) => {
      const messageAny = message as any;
      const senderIdFromMessage = messageAny.sender_id ?? messageAny.from;
      const senderInfo = messageAny.sender ?? null;

      const isFromMe = senderIdFromMessage === currentUserId;
      const isFromMainUser = senderIdFromMessage === mainUserId;
      const isFromOtherProfessional = !isFromMe && !isFromMainUser;

      // Generar color dinámico para colaboradores
      const dynamicColor = isFromOtherProfessional ? generateColorFromId(senderIdFromMessage) : null;

      // Construir nombre del remitente
      let senderName = "Usuario";
      let senderRole = "Usuario";

      if (senderInfo) {
        const firstName = senderInfo.firstName ?? "";
        const lastName = senderInfo.lastName ?? "";
        senderName = (`${firstName} ${lastName}`.trim() || senderInfo.email) ?? "Usuario";
        senderRole = senderInfo.role ?? "Usuario";
      }

      if (message.id) {
        console.log(`ðŸ” [Conversation] Mensaje ${message.id.substring(0, 8)}:`, {
          sender: senderIdFromMessage?.substring(0, 8),
          senderName,
          senderRole,
          currentUser: currentUserId?.substring(0, 8),
          mainUser: mainUserId?.substring(0, 8),
          isFromMe,
          isFromMainUser,
          isFromOtherProfessional,
          dynamicColor,
        });
      }

      return {
        ...message,
        messageDate: new Date(message.created_at).toDateString(),
        isFromMe,
        isFromMainUser,
        isFromOtherProfessional,
        senderName,
        senderRole,
        dynamicColor,
        isRecent: isRecentMessage(message.created_at),
        stableKey: message.id ?? `msg-${message.created_at}-${message.content?.substring(0, 10)}`,
      };
    });
  }, [messages, currentUserId, selectedConversation?.user_id]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Fecha no disponible";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Fecha inválida";
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Hoy";
    if (date.toDateString() === yesterday.toDateString()) return "Ayer";
    return date.toLocaleDateString("es-ES", { weekday: "long", month: "long", day: "numeric" });
  };

  if (!selectedConversation) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg bg-white dark:bg-gray-900/50">
        <div className="text-center">
          <div className="text-muted-foreground mb-4">
            <MoreHorizontal size={48} />
          </div>
          <p className="text-muted-foreground dark:text-muted-foreground mb-2 text-lg font-semibold">
            Selecciona una conversación
          </p>
          <p className="text-muted-foreground dark:text-muted-foreground text-sm">
            Elige un chat de la lista para comenzar a conversar
          </p>
        </div>
      </div>
    );
  }

  let lastDate: string | null = null;

  return (
    <div className="flex h-screen max-h-screen flex-col rounded-lg bg-white dark:bg-gray-900/50">
      <header className="border-border flex items-center border-b p-4 dark:border-gray-700">
        <div className="flex-grow">
          <div className="flex items-center gap-2">
            <h2 className="text-foreground text-lg font-bold dark:text-gray-100">{selectedConversation.name}</h2>
            {selectedConversation.isActive && <div className="h-2 w-2 rounded-full bg-[#2f855a]" />}
          </div>
          <p className="text-primary dark:text-primary-400 text-sm">
            {selectedConversation.tags.length > 0
              ? selectedConversation.tags.join(" | ")
              : selectedConversation.chat_type === "professional_professional" && selectedConversation.professionalRole
                ? `Rol: ${getRoleDisplayName(selectedConversation.professionalRole)}`
                : "Sin etiquetas"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isConnected && (
            <div className="flex items-center gap-1 text-xs text-[#9f4e63]">
              <div className="h-2 w-2 rounded-full bg-[#9f4e63]" />
              Sin conexión
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => {}} className="text-xs">
            Probar Límites
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (selectedConversation) {
                try {
                  await ChatService.getMessages(selectedConversation.id);
                } catch (error) {
                  console.error("Error obteniendo todos los mensajes:", error);
                }
              }
            }}
            className="text-xs"
          >
            Obtener Todos
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSavedResponsesPanelOpen(true)}
            title="Respuestas guardadas"
          >
            <MessageSquare className="text-muted-foreground dark:text-muted-foreground h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="text-muted-foreground dark:text-muted-foreground" />
          </Button>
        </div>
      </header>

      {/* Barra de búsqueda */}
      {searchQuery && (
        <div className="border-border bg-muted flex items-center gap-2 border-b px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-1 items-center gap-2">
            <Search className="text-muted-foreground h-4 w-4" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              placeholder="Buscar en mensajes..."
              className="flex-1"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                setCurrentSearchIndex(-1);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-foreground dark:text-muted-foreground text-sm">
                {currentSearchIndex + 1} de {searchResults.length}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Navigate search previous
                }}
                disabled={searchResults.length === 0}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Navigate search next
                }}
                disabled={searchResults.length === 0}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Panel de respuestas guardadas */}
      <SavedResponsesPanel
        isOpen={isSavedResponsesPanelOpen}
        onClose={() => setIsSavedResponsesPanelOpen(false)}
        onSelectResponse={(response: SavedResponse) => {
          // Insertar respuesta en el input
          if (messageInputRef.current) {
            messageInputRef.current.value = response.content;
            messageInputRef.current.focus();
            // Disparar evento change para actualizar el estado
            const event = new Event("input", { bubbles: true });
            messageInputRef.current.dispatchEvent(event);
          }
        }}
      />

      <main ref={messagesContainerRef} className="relative min-h-0 flex-1 overflow-y-auto p-4" onScroll={handleScroll}>
        {loading && messages.length === 0 ? (
          <div className="flex flex-col gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex animate-pulse items-end gap-2">
                <div className="bg-muted h-8 w-8 rounded-full dark:bg-gray-700" />
                <div className="bg-muted max-w-md rounded-lg p-3 dark:bg-gray-700">
                  <div className="bg-muted mb-1 h-4 rounded dark:bg-gray-600" />
                  <div className="bg-muted h-3 w-1/3 rounded dark:bg-gray-600" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {processedMessages.map((message) => {
              const showDateSeparator = message.messageDate !== lastDate;
              if (showDateSeparator) lastDate = message.messageDate;

              // Log para debug de renderizado
              const messageTyped = message as any;
              const msgContent = message.content ?? "";
              if (msgContent.includes("desde") || msgContent.includes("adviser") || msgContent.includes("dietista")) {
                let bgClass = "bg-muted";
                let messageType = "unknown";
                if (message.isFromMe) {
                  bgClass = "bg-[#FF690B]";
                  messageType = "Profesional actual";
                } else if (messageTyped.isFromMainUser) {
                  bgClass = "bg-muted";
                  messageType = `${messageTyped.senderName as string} (${messageTyped.senderRole as string})`;
                } else if (messageTyped.isFromOtherProfessional) {
                  bgClass = (messageTyped.dynamicColor as string) ?? "bg-[#363C98]";
                  messageType = `${messageTyped.senderName as string} (Colaborador)`;
                }
                const alignment = message.isFromMe ? "justify-end" : "justify-start";
                console.log(
                  `ðŸŽ¨ [Render] Mensaje "${msgContent.substring(0, 30)}": tipo=${messageType}, bgClass=${bgClass}, alignment=${alignment}`,
                );
              }

              // Determinar clase de color para el mensaje
              let messageColorClass = "bg-muted text-foreground dark:bg-gray-700 dark:text-gray-100";
              if (message.isFromMe) {
                messageColorClass = "bg-[#FF690B] text-white";
              } else if (messageTyped.isFromOtherProfessional && messageTyped.dynamicColor) {
                messageColorClass = `${messageTyped.dynamicColor as string} text-white`;
              }

              return (
                <React.Fragment key={message.stableKey}>
                  {showDateSeparator && (
                    <div className="my-2 flex justify-center">
                      <span className="text-muted-foreground bg-muted rounded-full px-3 py-1 text-xs dark:bg-gray-700 dark:text-gray-300">
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                  )}
                  <div
                    id={`message-${message.id}`}
                    className={clsx("group flex items-end gap-2", message.isFromMe ? "justify-end" : "justify-start")}
                    data-is-from-me={message.isFromMe}
                  >
                    <div
                      className={clsx(
                        "max-w-2xl rounded-lg p-3 transition-all duration-200",
                        messageColorClass,
                        message.isFromMe ? "rounded-br-none" : "rounded-bl-none",
                        {
                          "ring-2 ring-blue-300 dark:ring-blue-600": message.isRecent && !message.isFromMe,
                          "opacity-90": !message.isRead && !message.isFromMe,
                        },
                      )}
                    >
                      {/* Badge para identificar el remitente */}
                      {messageTyped.isFromOtherProfessional && (
                        <div className="mb-1 flex items-center gap-1 text-xs font-semibold opacity-90">
                          <User className="h-3 w-3" />
                          {messageTyped.senderName} (Colaborador)
                        </div>
                      )}
                      {messageTyped.isFromMainUser && (
                        <div className="mb-1 flex items-center gap-1 text-xs font-semibold opacity-80">
                          <UserCircle className="h-3 w-3" />
                          {messageTyped.senderName} ({messageTyped.senderRole})
                        </div>
                      )}
                      {/* Mostrar mensaje citado si existe */}
                      {message.reply_to_message && (
                        <div className="border-border mb-2 border-l-2 pl-2 text-xs opacity-80 dark:border-gray-600">
                          <div className="font-semibold">
                            {((
                              (message.reply_to_message as unknown as Record<string, unknown>)?.sender as Record<
                                string,
                                unknown
                              >
                            )?.firstName as string) ?? "Usuario"}
                          </div>
                          <div className="truncate">
                            {(message.reply_to_message as typeof message).content?.substring(0, 100)}
                            {(message.reply_to_message as typeof message).content &&
                            (message.reply_to_message as typeof message).content &&
                            (message.reply_to_message as typeof message).content.length > 100
                              ? "..."
                              : ""}
                          </div>
                        </div>
                      )}
                      <div className="text-sm break-words whitespace-pre-wrap">
                        {(() => {
                          const isExpanded = expandedMessages.has(message.id);
                          const content = message.content ?? "";
                          const isLong = isLongMessage(content);

                          // Aplicar resaltado si hay búsqueda activa
                          const displayContent = content;

                          if (!isLong || isExpanded) {
                            return (
                              <div>
                                {displayContent}
                                {isLong && isExpanded && (
                                  <div className="mt-2">
                                    <button
                                      onClick={() => toggleMessageExpansion(message.id)}
                                      className="flex items-center gap-1 text-xs text-[#363C98] hover:text-[#363C98] dark:text-[#363C98] dark:hover:text-[#363C98]"
                                    >
                                      Ver menos <ChevronUp className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // Mostrar solo las primeras líneas para mensajes largos
                          const lines = content.split("\n");
                          const preview = lines.slice(0, 3).join("\n");
                          const hasMore = lines.length > 3 || content.length > 200;
                          const displayPreview = preview;

                          return (
                            <div>
                              {displayPreview}
                              {hasMore && (
                                <div className="mt-2">
                                  <button
                                    onClick={() => toggleMessageExpansion(message.id)}
                                    className="flex items-center gap-1 text-xs text-[#363C98] hover:text-[#363C98] dark:text-[#363C98] dark:hover:text-[#363C98]"
                                  >
                                    Ver más <ChevronDown className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          {!message.isFromMe && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setReplyingTo(message)}
                              className="h-6 px-2 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                              title="Responder"
                            >
                              <Reply className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <p className="text-xs opacity-70">{formatMessageTime(message.created_at)}</p>
                          {message.isFromMe && (
                            <div className="text-xs opacity-70">{message.isRead ? "âœ“âœ“" : "âœ“"}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-[#e8d8de] p-3 dark:bg-red-900/20">
            <p className="text-sm text-[#9f4e63] dark:text-[#9f4e63]">{error}</p>
          </div>
        )}
        {showScrollButton && (
          <button
            onClick={() => scrollToBottom(true)}
            className="bg-primary hover:bg-primary/90 fixed right-8 bottom-20 z-10 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200"
            title="Ir al final"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        )}
      </main>

      <MessageInput
        selectedConversation={selectedConversation}
        sendMessage={sendMessage}
        loading={loading}
        isConnected={isConnected}
        inputRef={messageInputRef}
        markAsRead={markAsRead}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        isCurrentUserParticipant={isCurrentUserParticipant}
        participantCheckError={participantCheckError}
      />
    </div>
  );
}
