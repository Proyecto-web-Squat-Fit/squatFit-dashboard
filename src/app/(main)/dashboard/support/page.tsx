"use client";

import React from "react";

import { Search } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { SupportProvider } from "@/contexts/support-context";

import TicketConversation from "./_components/TicketConversation";
import TicketList from "./_components/TicketList";

/**
 * Página principal del sistema de soporte
 *
 * Esta página organiza el layout del sistema de soporte en dos columnas:
 * - Columna izquierda: Lista de tickets asignados
 * - Columna derecha: Conversación del ticket seleccionado
 *
 * Características:
 * - Layout responsivo de 2 columnas
 * - Búsqueda de tickets
 * - Integración completa con el contexto de soporte
 * - Gestión de mensajes en tiempo real
 */
function SupportPageContent() {
  const { user, token } = useAuth();

  if (!token) return null;

  return (
    <div className="flex h-screen max-h-screen flex-col gap-4 lg:flex-row">
      {/* COLUMNA IZQUIERDA - Lista de tickets */}
      <div className="border-primary/10 h-full w-full space-y-5 border-r pr-2 lg:w-1/3">
        {/* Barra de búsqueda */}
        <div className="border-border flex h-fit w-full flex-row items-center gap-2 rounded-full border bg-[#d7e3ee] p-2">
          <Search className="text-[#6c727e]" size={16} />
          <input placeholder="Buscar un ticket..." type="text" className="w-full bg-transparent text-sm outline-none" />
        </div>

        {/* Información del agente */}
        <div className="rounded-lg bg-[#e8d8de] p-3 dark:bg-purple-900/20">
          <p className="text-xs font-medium text-[#9f4e63] dark:text-[#9f4e63]">Agente de Soporte</p>
          <p className="text-sm text-[#9f4e63] dark:text-[#9f4e63]">{user?.email ?? "Cargando..."}</p>
        </div>

        {/* Lista de tickets */}
        <div className="flex-grow overflow-hidden">
          <TicketList />
        </div>
      </div>

      {/* COLUMNA DERECHA - Conversación del ticket */}
      <div className="flex h-full w-full flex-col gap-4 lg:w-2/3">
        <TicketConversation />
      </div>
    </div>
  );
}

/**
 * Página con Provider de soporte
 */
export default function SupportPage() {
  return (
    <SupportProvider>
      <SupportPageContent />
    </SupportProvider>
  );
}
