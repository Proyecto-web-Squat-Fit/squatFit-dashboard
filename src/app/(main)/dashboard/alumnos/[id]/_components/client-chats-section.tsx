"use client";

import { useEffect, useState } from "react";

import { CloudOff, Inbox, Lock, MessagesSquare, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientWaHistory } from "@/hooks/use-client-wa-history";
import { ClientWaHistoryError } from "@/lib/services/client-wa-history-service";

import { ClientChatsThread } from "./client-chats-thread";

/** Debounce local para no disparar una búsqueda por cada tecla (igual que en Pedidos). */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

/** Envoltorio común: todos los estados de la pestaña comparten cabecera. */
function SectionCard({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessagesSquare className="size-5" /> Chats
        </CardTitle>
        <CardDescription>
          Historial de WhatsApp del cliente, solo lectura (chats ya enlazados a su cuenta).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        {action}
      </CardContent>
    </Card>
  );
}

function Notice({
  icon,
  title,
  children,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  tone?: "neutral" | "warning";
}) {
  const box =
    tone === "warning" ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40" : "border-dashed";
  return (
    <div className={`flex items-start gap-3 rounded-md border p-4 ${box}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="space-y-1 text-sm">
        <p className="font-medium">{title}</p>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

/**
 * Estados de error. «Sin permiso» nunca se pinta como «no hay chats»: son
 * cosas opuestas para el staff (mismo criterio que la pestaña Progreso).
 */
function ChatsErrorState({ error, onRetry, retrying }: { error: Error; onRetry: () => void; retrying: boolean }) {
  const apiError = error instanceof ClientWaHistoryError ? error : null;

  if (apiError?.isForbidden) {
    return (
      <SectionCard>
        <Notice
          tone="warning"
          icon={<Lock className="size-5 text-amber-700 dark:text-amber-400" />}
          title="No tienes permiso para ver los chats de este cliente"
        >
          El historial de WhatsApp es solo para el rol <code>admin</code> (migración del permiso <code>wa-history</code>
          ). Esto <strong>no significa que el cliente no tenga conversaciones</strong>: significa que el backend ha
          denegado la consulta. Si necesitas acceso, pídelo a un administrador.
        </Notice>
      </SectionCard>
    );
  }

  if (apiError?.isNotFound) {
    return (
      <SectionCard>
        <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
          No se ha encontrado este cliente en el backend.
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      action={
        <Button variant="outline" size="sm" className="gap-2" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={`size-4 ${retrying ? "animate-spin" : ""}`} />
          Reintentar
        </Button>
      }
    >
      <Notice icon={<CloudOff className="text-muted-foreground size-5" />} title="No se ha podido cargar el chat">
        {error.message}
        {apiError?.status ? ` (HTTP ${apiError.status})` : ""}. No sabemos si este cliente tiene chats o no: la consulta
        ha fallado.
      </Notice>
    </SectionCard>
  );
}

/**
 * Pestaña «Chats» de la ficha del alumno (tablero F3 nº 139, Fase C):
 * historial de WhatsApp SOLO LECTURA. Copia el patrón de estados de
 * `ClientProgressSection` (carga / error tipado / vacío / contenido).
 */
export function ClientChatsSection({ userId }: { userId: string }) {
  const [searchInput, setSearchInput] = useState("");
  const [selectedChatRef, setSelectedChatRef] = useState<number | "all">("all");
  const debouncedSearch = useDebounce(searchInput, 400);

  const { isLoading, error, refetch, isFetching, isFetchingNextPage, fetchNextPage, messages, chats, hasOlder, data } =
    useClientWaHistory(userId, debouncedSearch);

  // Volver a «todas las conversaciones» si cambia la búsqueda: un chat_ref
  // filtrado antes puede no tener ninguna coincidencia con el nuevo texto y
  // la pestaña parecería vacía sin motivo aparente.
  useEffect(() => {
    setSelectedChatRef("all");
  }, [debouncedSearch]);

  if (isLoading) {
    return (
      <SectionCard>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-[480px] w-full" />
      </SectionCard>
    );
  }

  if (error) {
    return <ChatsErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />;
  }

  // `summary` sale de la misma `data.pages[0]` que `firstPage`, así que en
  // cuanto hay `firstPage` también hay `summary`: un solo guard basta.
  const firstPage = data?.pages[0];
  if (!firstPage) return null;

  if (chats.length === 0) {
    return (
      <SectionCard>
        <Notice
          icon={<Inbox className="text-muted-foreground size-5" />}
          title="Este cliente todavía no tiene conversaciones enlazadas"
        >
          No es un error: de los chats de WhatsApp importados, solo se enlazan aquí los que ya se han emparejado con la
          cuenta del cliente, y ese emparejamiento por teléfono todavía no se ha ejecutado en producción para la
          mayoría. En cuanto se enlace su número, la conversación aparecerá aquí sola.
        </Notice>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <ClientChatsThread
        history={firstPage}
        messages={messages}
        hasOlder={hasOlder}
        isFetchingOlder={isFetchingNextPage}
        onLoadOlder={() => void fetchNextPage()}
        selectedChatRef={selectedChatRef}
        onSelectChatRef={setSelectedChatRef}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
      />
    </SectionCard>
  );
}
