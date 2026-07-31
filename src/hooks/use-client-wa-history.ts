import { useMemo } from "react";

import { useInfiniteQuery } from "@tanstack/react-query";

import {
  ClientWaHistoryError,
  ClientWaHistoryService,
  WA_HISTORY_MIN_SEARCH,
  type UserWaHistoryResponse,
  type WaMessageItem,
} from "@/lib/services/client-wa-history-service";

// ============================================================================
// QUERY KEYS
// ============================================================================

export const clientWaHistoryKeys = {
  all: ["client-wa-history"] as const,
  // `q` normalizado forma parte de la key: es un hilo distinto (cursores de
  // una búsqueda no valen para otra), así que cambiar de búsqueda tiene que
  // arrancar su propia paginación, no mezclarse con la del hilo sin filtrar.
  thread: (userId: string, q: string) => [...clientWaHistoryKeys.all, userId, q] as const,
};

/**
 * Hilo de WhatsApp de un cliente para la pestaña «Chats» de la ficha
 * (GET /admin-panel/wa-history/:userId), con scroll infinito HACIA ARRIBA:
 * cada página siguiente (`fetchNextPage`) pide `page.next_cursor`, que trae
 * mensajes MÁS ANTIGUOS que los ya cargados.
 *
 * TanStack acumula `data.pages` en el orden en que se piden (más reciente
 * primero, luego cada vez más antiguo); como el hilo se pinta de arriba
 * (antiguo) a abajo (reciente), `flatMessages` le da la vuelta al array de
 * páginas antes de concatenar.
 *
 * No se reintenta en 401/403 (sin permiso — incluye el caso «migración del
 * permiso sin aplicar», que falla cerrado a propósito), ni en 404 (usuario
 * inexistente), ni en 400 (cursor roto o búsqueda demasiado corta: error
 * nuestro, no de red). Los fallos de red sí se reintentan una vez.
 */
export function useClientWaHistory(userId: string, q: string) {
  const normalizedQ = q.trim().length >= WA_HISTORY_MIN_SEARCH ? q.trim() : "";

  const query = useInfiniteQuery<UserWaHistoryResponse, ClientWaHistoryError>({
    queryKey: clientWaHistoryKeys.thread(userId, normalizedQ),
    queryFn: ({ pageParam }) =>
      ClientWaHistoryService.getHistory(userId, {
        cursor: (pageParam as string | null | undefined) ?? undefined,
        q: normalizedQ || undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.page.has_more ? (lastPage.page.next_cursor ?? undefined) : undefined),
    enabled: !!userId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error instanceof ClientWaHistoryError && (error.isForbidden || error.isNotFound || error.isBadRequest)) {
        return false;
      }
      return failureCount < 1;
    },
  });

  const data = query.data;

  // Memoizado sobre `data` (no sobre `query` entero, que cambia de
  // referencia en CADA render — p. ej. en cuanto `isFetchingNextPage` pasa a
  // `true`, antes de que la red resuelva). Sin esto, `messages`/`chats` eran
  // arrays NUEVOS aunque el contenido no hubiera cambiado, y como
  // `ClientChatsThread` memoiza su `useLayoutEffect` de anti-salto sobre esa
  // misma referencia, el efecto se disparaba de más en esos renders
  // intermedios. Es una mejora real y verificada con Puppeteer (antes de
  // esto el efecto corría con datos a medio cargar); OJO: NO es, por sí
  // sola, la solución completa al salto de scroll al anteponer mensajes
  // — sigue habiendo un salto real en pruebas con varias páginas que no se
  // ha terminado de diagnosticar (ver client-chats-thread.tsx).
  // Solo lo DERIVADO de `data` se memoiza; el resto de `query` (isLoading,
  // isFetchingNextPage, error, fetchNextPage...) se toma fresco cada render
  // — si también fuera parte de este objeto memoizado, quedaría CONGELADO al
  // valor que tenía la última vez que `data` cambió, y p. ej.
  // `isFetchingNextPage` nunca llegaría a `true` a ojos del componente.
  const derivado = useMemo(() => {
    const pages = data?.pages ?? [];
    // Página más reciente = la primera pedida (sin cursor); las siguientes
    // son cada vez más antiguas. Se invierte para pintar de arriba (antiguo)
    // a abajo (reciente), y dentro de cada página el backend ya viene
    // ascendente.
    const messages: WaMessageItem[] = [...pages].reverse().flatMap((p) => p.messages);
    const chats = pages[0]?.chats ?? [];
    const summary = pages[0]?.summary ?? null;
    const search = pages[0]?.search ?? null;
    // Queda historial más antiguo si la ÚLTIMA página pedida (la más vieja
    // cargada hasta ahora) todavía dice `has_more`.
    const hasOlder = pages.length > 0 ? pages[pages.length - 1].page.has_more : false;
    return { messages, chats, summary, search, hasOlder };
  }, [data]);

  return { ...query, ...derivado };
}
