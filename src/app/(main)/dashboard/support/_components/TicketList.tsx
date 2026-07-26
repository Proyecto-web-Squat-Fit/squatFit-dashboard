"use client";

import { useState, useMemo } from "react";

import clsx from "clsx";
import { AlertCircle, Clock, CheckCircle, Loader2, Ticket as TicketIcon } from "lucide-react";

import { useSupport } from "@/contexts/support-context";
import { formatMessageTime, getInitials } from "@/lib/services/support-service";
import { TicketPriority, TicketStatus } from "@/lib/services/support-types";

const PRIORITY_CONFIG: Record<TicketPriority, { icon: any; color: string; label: string }> = {
  low: { icon: Clock, color: "text-[#363C98]", label: "Baja" },
  medium: { icon: Clock, color: "text-[#FF690B]", label: "Media" },
  high: { icon: AlertCircle, color: "text-[#FF690B]", label: "Alta" },
  urgent: { icon: AlertCircle, color: "text-[#9f4e63]", label: "Urgente" },
};

const STATUS_CONFIG: Record<TicketStatus, { color: string; label: string }> = {
  pending: { color: "bg-muted text-foreground", label: "Pendiente" },
  in_progress: { color: "bg-[#e7e6ff] text-[#363C98]", label: "En Progreso" },
  resolved: { color: "bg-[#e4f0ea] text-[#2f855a]", label: "Resuelto" },
  closed: { color: "bg-muted text-muted-foreground", label: "Cerrado" },
};

export default function TicketList() {
  const { tickets, selectedTicket, selectTicket, loading, error, isConnected, loadTickets } = useSupport();
  const [searchQuery, setSearchQuery] = useState("");

  // Filtrar tickets por búsqueda
  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;

    const query = searchQuery.toLowerCase();
    return tickets.filter(
      (ticket) =>
        ticket.title.toLowerCase().includes(query) ||
        ticket.description.toLowerCase().includes(query) ||
        ticket.user?.email.toLowerCase().includes(query) ||
        ticket.category.toLowerCase().includes(query),
    );
  }, [tickets, searchQuery]);

  // Ordenar tickets por prioridad y fecha
  const sortedTickets = useMemo(() => {
    const priorityOrder: Record<TicketPriority, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return [...filteredTickets].sort((a, b) => {
      // Primero por prioridad
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Luego por fecha (más reciente primero)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [filteredTickets]);

  // Renderizar avatar del ticket
  const renderTicketAvatar = (ticket: any) => {
    const PriorityIcon = PRIORITY_CONFIG[ticket.priority as TicketPriority].icon;

    return (
      <div className="relative flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-[#9f4e63] text-sm font-semibold text-white">
          {getInitials(ticket.user?.email ?? ticket.title)}
        </div>
        {/* Indicador de prioridad */}
        <div className="absolute -right-1 -bottom-1">
          <PriorityIcon className={`h-4 w-4 ${PRIORITY_CONFIG[ticket.priority as TicketPriority].color}`} />
        </div>
      </div>
    );
  };

  // Renderizar información del ticket
  const renderTicketInfo = (ticket: any) => (
    <div className="min-w-0 flex-grow overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <p className="text-foreground truncate text-sm font-semibold dark:text-gray-100">{ticket.title}</p>
        {ticket.updated_at && (
          <span className="text-muted-foreground dark:text-muted-foreground flex-shrink-0 text-xs">
            {formatMessageTime(ticket.updated_at)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[ticket.status as TicketStatus].color}`}
        >
          {STATUS_CONFIG[ticket.status as TicketStatus].label}
        </span>
        <span className="text-muted-foreground dark:text-muted-foreground truncate text-xs">{ticket.category}</span>
      </div>

      {ticket.user?.email && (
        <p className="text-muted-foreground dark:text-muted-foreground truncate text-xs">{ticket.user.email}</p>
      )}
    </div>
  );

  // Renderizar metadata
  const renderTicketMetadata = (ticket: any) => (
    <div className="ml-2 flex flex-shrink-0 flex-col items-end gap-y-1">
      {(ticket.unread ?? 0) > 0 && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#9f4e63] text-xs font-bold text-white shadow-sm">
          {ticket.unread > 99 ? "99+" : ticket.unread}
        </div>
      )}
    </div>
  );

  // Renderizar estados
  if (loading && tickets.length === 0) {
    return (
      <div className="flex flex-col gap-1 p-2">
        <div className="text-muted-foreground flex items-center gap-2 p-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando tickets...
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={`loading-${i}`} className="flex animate-pulse items-center gap-3 rounded-lg p-2.5">
            <div className="bg-muted h-10 w-10 rounded-full dark:bg-gray-700" />
            <div className="flex-grow">
              <div className="bg-muted mb-1 h-4 rounded dark:bg-gray-700" />
              <div className="bg-muted h-3 w-2/3 rounded dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center">
        <div className="mb-2 text-[#9f4e63]">
          <AlertCircle size={24} />
        </div>
        <p className="mb-2 text-sm text-[#9f4e63] dark:text-[#9f4e63]">Error cargando tickets</p>
        <p className="text-muted-foreground dark:text-muted-foreground text-xs">{error}</p>
        <div className="text-muted-foreground mt-3 flex items-center gap-2 text-xs">
          <Loader2 className="h-3 w-3 animate-spin" />
          Reintentando automáticamente...
        </div>
      </div>
    );
  }

  if (tickets.length === 0 && !loading && !error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center">
        <div className="text-muted-foreground mb-2">
          <TicketIcon size={24} />
        </div>
        <p className="text-muted-foreground dark:text-muted-foreground text-sm">No hay tickets asignados</p>
        <p className="text-muted-foreground dark:text-muted-foreground mt-1 text-xs">
          Los tickets aparecerán aquí cuando sean asignados
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {/* Indicador de estado */}
      <div className="flex items-center justify-between px-2 py-1 text-xs">
        <span className="text-muted-foreground dark:text-muted-foreground">{tickets.length} tickets</span>
        <div className="flex items-center gap-1">
          {isConnected ? (
            <>
              <CheckCircle size={12} className="text-[#2f855a]" />
              <span className="text-[#2f855a] dark:text-[#2f855a]">Conectado</span>
            </>
          ) : (
            <>
              <AlertCircle size={12} className="text-[#9f4e63]" />
              <span className="text-[#9f4e63] dark:text-[#9f4e63]">Desconectado</span>
            </>
          )}
        </div>
      </div>

      {/* Lista de tickets */}
      {sortedTickets.map((ticket) => (
        <div
          key={ticket.id}
          className={clsx("flex cursor-pointer items-center gap-3 rounded-lg p-2.5 transition-all duration-150", {
            "bg-[#e8d8de]/70 shadow-sm dark:bg-purple-900/40": selectedTicket?.id === ticket.id,
            "hover:bg-muted/80 dark:hover:bg-gray-800/60": selectedTicket?.id !== ticket.id,
            "border-l-2 border-[#9f4e63]": (ticket.unread ?? 0) > 0,
          })}
          onClick={() => selectTicket(ticket.id)}
        >
          {renderTicketAvatar(ticket)}
          {renderTicketInfo(ticket)}
          {renderTicketMetadata(ticket)}
        </div>
      ))}

      {/* No hay resultados de búsqueda */}
      {searchQuery && sortedTickets.length === 0 && (
        <div className="flex flex-col items-center justify-center p-4 text-center">
          <div className="text-muted-foreground mb-2">
            <TicketIcon size={24} />
          </div>
          <p className="text-muted-foreground dark:text-muted-foreground text-sm">No se encontraron tickets</p>
          <p className="text-muted-foreground dark:text-muted-foreground text-xs">
            Intenta con otros términos de búsqueda
          </p>
        </div>
      )}
    </div>
  );
}
