"use client";

import { useState, useMemo } from "react";

import { useChat } from "@/contexts/chat-context";

/**
 * Componente Filtros - Filtros para las conversaciones
 *
 * Este componente permite filtrar las conversaciones por diferentes
 * criterios como etiquetas, estado de lectura, etc.
 *
 * Características:
 * - Filtros por etiquetas
 * - Filtro de mensajes no leídos
 * - Filtro de conversaciones activas
 * - Contadores dinámicos
 */
export default function Filtros() {
  const { conversations } = useChat();
  const [activeFilter, setActiveFilter] = useState("Todos");

  // Calcular contadores para cada filtro
  const filterCounts = useMemo(() => {
    const counts = {
      Todos: conversations.length,
      "No leídos": conversations.filter((conv) => conv.unread > 0).length,
      Activos: conversations.filter((conv) => conv.isActive).length,
    };

    // Contar por etiquetas únicas
    const allTags = conversations.flatMap((conv) => conv.tags ?? []);
    const uniqueTags = [...new Set(allTags)];

    uniqueTags.forEach((tag) => {
      (counts as any)[tag] = conversations.filter((conv) => conv.tags && conv.tags.includes(tag)).length;
    });

    return counts;
  }, [conversations]);

  // Obtener todas las etiquetas únicas
  const allTags = useMemo(() => {
    const tags = conversations.flatMap((conv) => conv.tags ?? []);
    return [...new Set(tags)].sort();
  }, [conversations]);

  // Filtros disponibles
  const filters = [
    { id: "Todos", label: "Todos", count: filterCounts.Todos },
    { id: "No leídos", label: "No leídos", count: filterCounts["No leídos"] },
    { id: "Activos", label: "Activos", count: filterCounts["Activos"] },
    ...allTags.map((tag) => ({
      id: tag,
      label: tag,
      count: (filterCounts as any)[tag] ?? 0,
    })),
  ];

  return (
    <div>
      <div className="flex w-full flex-row gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((filter) => (
          <button
            key={filter.id}
            className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-150 ${
              activeFilter === filter.id
                ? "bg-primary text-white shadow-sm"
                : "text-foreground bg-muted hover:bg-muted dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
            onClick={() => setActiveFilter(filter.id)}
          >
            <span>{filter.label}</span>
            {filter.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  activeFilter === filter.id
                    ? "bg-white/20 text-white"
                    : "text-foreground bg-muted dark:bg-gray-600 dark:text-gray-300"
                }`}
              >
                {filter.count > 99 ? "99+" : filter.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
