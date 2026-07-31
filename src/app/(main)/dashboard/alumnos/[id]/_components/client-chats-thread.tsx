"use client";

import { useLayoutEffect, useMemo, useRef } from "react";

import { AlertTriangle, Eye, Loader2, Mic, Paperclip, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  WA_HISTORY_MIN_SEARCH,
  type UserWaHistoryResponse,
  type WaMessageItem,
} from "@/lib/services/client-wa-history-service";

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
const dayKey = (iso: string) => iso.slice(0, 10);

const KIND_LABEL: Record<string, string> = {
  image: "Imagen adjunta",
  video: "Vídeo adjunto",
  doc: "Documento adjunto",
};

/** Contenido de una burbuja según el tipo de mensaje. */
function MessageBody({ message }: { message: WaMessageItem }) {
  if (message.kind === "audio") {
    if (message.transcript_pending) {
      return (
        <p className="flex items-center gap-1.5 text-sm italic opacity-80">
          <Mic className="size-3.5 shrink-0" /> Nota de voz sin transcribir todavía.
        </p>
      );
    }
    return (
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-xs font-medium opacity-70">
          <Mic className="size-3.5 shrink-0" /> Transcripción de la nota de voz
        </p>
        <p className="text-sm italic">«{message.transcript}»</p>
      </div>
    );
  }

  if (message.kind === "image" || message.kind === "video" || message.kind === "doc") {
    return (
      <p className="flex items-center gap-1.5 text-sm opacity-80">
        <Paperclip className="size-3.5 shrink-0" />
        {KIND_LABEL[message.kind]}
        <span className="text-xs italic opacity-70">(el archivo no se guardó, solo consta que existió)</span>
      </p>
    );
  }

  if (message.kind === "system") {
    return <p className="text-xs italic opacity-80">{message.body ?? "Aviso de WhatsApp"}</p>;
  }

  // text (o cualquier kind futuro sin manejar aquí): el texto tal cual, o un
  // aviso si por lo que sea no trae body (no debería pasar, pero mejor esto
  // que una burbuja en blanco).
  return <p className="text-sm break-words whitespace-pre-wrap">{message.body ?? "(mensaje sin contenido)"}</p>;
}

/** Una burbuja de mensaje del cliente, del equipo, o un aviso de sistema centrado. */
function MessageBubble({ message }: { message: WaMessageItem }) {
  if (message.direction === "sys") {
    return (
      <div className="flex justify-center py-1">
        <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs">
          {message.body ?? "Aviso de sistema"} · {fmtTime(message.sent_at)}
        </span>
      </div>
    );
  }

  const fromClient = message.direction === "in";
  return (
    <div className={`flex ${fromClient ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 ${
          fromClient ? "bg-muted" : "bg-[#EBEAF2] text-[#363C98] dark:bg-[#363C98]/30 dark:text-[#b9bce8]"
        }`}
      >
        <MessageBody message={message} />
        <p className="mt-1 text-right text-[10px] opacity-60">{fmtTime(message.sent_at)}</p>
      </div>
    </div>
  );
}

/** Separador «13 de julio de 2026» entre mensajes de días distintos. */
function DaySeparator({ iso }: { iso: string }) {
  return (
    <div className="flex items-center justify-center py-2">
      <span className="text-muted-foreground bg-background rounded-full border px-3 py-0.5 text-xs">{fmtDay(iso)}</span>
    </div>
  );
}

interface ClientChatsThreadProps {
  history: UserWaHistoryResponse;
  messages: WaMessageItem[];
  hasOlder: boolean;
  isFetchingOlder: boolean;
  onLoadOlder: () => void;
  selectedChatRef: number | "all";
  onSelectChatRef: (ref: number | "all") => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
}

/**
 * Hilo cronológico de la pestaña «Chats». SOLO LECTURA: no hay caja de
 * respuesta ni acción alguna sobre los mensajes a propósito (F3 nº 139).
 */
export function ClientChatsThread({
  history,
  messages,
  hasOlder,
  isFetchingOlder,
  onLoadOlder,
  selectedChatRef,
  onSelectChatRef,
  searchInput,
  onSearchInputChange,
}: ClientChatsThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Alto del contenedor justo antes de pedir la página anterior, para poder
  // mantener el punto de lectura del staff cuando se anteponen mensajes más
  // antiguos en vez de que la vista salte arriba de golpe.
  const prevScrollHeightRef = useRef<number | null>(null);
  const wasLoadingOlderRef = useRef(false);

  const visible = useMemo(
    () => (selectedChatRef === "all" ? messages : messages.filter((m) => m.chat_ref === selectedChatRef)),
    [messages, selectedChatRef],
  );

  const searchTooShort = searchInput.trim().length > 0 && searchInput.trim().length < WA_HISTORY_MIN_SEARCH;

  // Scroll hacia arriba = mensajes más antiguos, como cualquier app de chat.
  // Umbral generoso (150px) para pedir la página anterior un poco antes de
  // que el staff llegue al tope y note el salto.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || isFetchingOlder || !hasOlder) return;
    if (el.scrollTop < 150) {
      prevScrollHeightRef.current = el.scrollHeight;
      wasLoadingOlderRef.current = true;
      onLoadOlder();
    }
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (wasLoadingOlderRef.current && prevScrollHeightRef.current != null) {
      // Se acaban de anteponer mensajes más antiguos arriba: se mantiene el
      // punto de lectura en vez de tirar al staff al principio del hilo.
      el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
    } else {
      // Carga inicial, cambio de chat seleccionado o de búsqueda: aterriza en
      // lo más reciente, como se abre cualquier conversación.
      el.scrollTop = el.scrollHeight;
    }
    wasLoadingOlderRef.current = false;
    prevScrollHeightRef.current = null;
  }, [visible]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {history.chats.length > 1 && (
          <Select
            value={String(selectedChatRef)}
            onValueChange={(v) => onSelectChatRef(v === "all" ? "all" : Number(v))}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las conversaciones ({history.chats.length})</SelectItem>
              {history.chats.map((c) => (
                <SelectItem key={c.ref} value={String(c.ref)}>
                  {c.display_name ?? "Sin nombre"} ({c.message_count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            placeholder="Buscar en la conversación…"
            className="pl-8"
            aria-invalid={searchTooShort}
          />
        </div>

        {history.search && (
          <Badge variant="outline" className="shrink-0">
            {history.search.matches} coincidencia{history.search.matches === 1 ? "" : "s"} en todo el historial
          </Badge>
        )}
      </div>

      {searchTooShort && (
        <p className="text-muted-foreground text-xs">
          Escribe al menos {WA_HISTORY_MIN_SEARCH} caracteres para buscar.
        </p>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="bg-background/40 flex h-[480px] flex-col gap-1 overflow-y-auto rounded-md border p-3"
      >
        <div className="flex justify-center pb-2">
          {isFetchingOlder ? (
            <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Loader2 className="size-3.5 animate-spin" /> Cargando mensajes anteriores…
            </span>
          ) : !hasOlder ? (
            <span className="text-muted-foreground text-xs">Inicio de la conversación.</span>
          ) : (
            <span className="text-muted-foreground text-xs">Sube para ver mensajes anteriores.</span>
          )}
        </div>

        {visible.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {selectedChatRef === "all"
              ? "No hay mensajes que mostrar."
              : "Esta conversación no tiene mensajes en la página cargada; sube para cargar más o mira «Todas las conversaciones»."}
          </p>
        ) : (
          visible.map((m, i) => {
            const prev = i === 0 ? undefined : visible.at(i - 1);
            const showDay = !prev || dayKey(prev.sent_at) !== dayKey(m.sent_at);
            return (
              <div key={m.id}>
                {showDay && <DaySeparator iso={m.sent_at} />}
                <MessageBubble message={m} />
              </div>
            );
          })
        )}
      </div>

      <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Eye className="size-3.5" />
        Historial de solo lectura: no se puede responder ni borrar nada desde aquí.
      </p>

      {history.summary.audios_without_transcript > 0 && (
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <AlertTriangle className="size-3.5 shrink-0 text-amber-600" />
          {history.summary.audios_without_transcript} nota
          {history.summary.audios_without_transcript === 1 ? " de voz" : "s de voz"} sin transcribir en este historial:
          esa parte de la conversación no es legible aquí.
        </p>
      )}
    </div>
  );
}
