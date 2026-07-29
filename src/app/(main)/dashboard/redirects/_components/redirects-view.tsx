"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Copy, ExternalLink, Link2, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteRedirect, useRedirects } from "@/hooks/use-redirects";
import type { Redirect } from "@/lib/services/redirects-service";

import { RedirectFormDialog } from "./redirect-form-dialog";

const PAGE_SIZE = 25;
// Dominio público de los pretty links (mismo criterio que downsell-engine.ts,
// que ya hardcodea squadfit.es al no existir una env var de sitio público).
const PUBLIC_SITE_URL = "https://squadfit.es";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function CopyShortUrlButton({ slug }: { readonly slug: string }) {
  const [copied, setCopied] = useState(false);
  const shortUrl = `${PUBLIC_SITE_URL}/r/${slug}`;

  return (
    <Button
      variant="ghost"
      size="icon"
      title={copied ? "Copiado" : `Copiar ${shortUrl}`}
      onClick={() => {
        void navigator.clipboard?.writeText(shortUrl).then(() => {
          setCopied(true);
          toast.success("URL corta copiada");
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </Button>
  );
}

function formatDate(value: string): string {
  try {
    return format(new Date(value), "d MMM yyyy, HH:mm", { locale: es });
  } catch {
    return value;
  }
}

/**
 * REDIRECCIONES / Pretty Links (F2, back office). CRUD de administración de
 * `/r/<slug>` sobre admin-panel/redirects/* (13.7). El endpoint público que
 * resuelve el slug y suma el hit vive en el backend; aquí solo se gestionan
 * alta, edición, baja y copia de la URL corta.
 *
 * Carga inicial masiva (73 pretty links del WordPress viejo): backend trae
 * `scripts/import-redirects.ts` para eso; esta página es para el día a día.
 */
export function RedirectsView() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [activeFilter, setActiveFilter] = useState<"todos" | "true" | "false">("todos");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRedirect, setEditingRedirect] = useState<Redirect | null>(null);
  const [deletingRedirect, setDeletingRedirect] = useState<Redirect | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, activeFilter]);

  const query = useRedirects({
    search: debouncedSearch || undefined,
    active: activeFilter === "todos" ? undefined : activeFilter,
    page,
    limit: PAGE_SIZE,
  });
  const deleteMutation = useDeleteRedirect();

  const rows = query.data?.data ?? null;
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Si la página en la que estamos deja de existir (p. ej. se borra la única
  // fila de la última página), recorta `page` a la última página válida en
  // cuanto la lista responde. Sin esto la tabla queda en un callejón sin
  // salida: página vacía, sin filtro puesto, y sin botón de paginación para
  // volver atrás (los controles se ocultan con `totalPages > 1`).
  useEffect(() => {
    if (query.data && page > totalPages) {
      setPage(totalPages);
    }
  }, [query.data, page, totalPages]);

  const openCreate = () => {
    setEditingRedirect(null);
    setDialogOpen(true);
  };

  const openEdit = (redirect: Redirect) => {
    setEditingRedirect(redirect);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingRedirect) return;
    await deleteMutation.mutateAsync(deletingRedirect.id);
    setDeletingRedirect(null);
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Redirecciones</h1>
          <p className="text-muted-foreground text-sm">
            Pretty links del dominio (<code>squadfit.es/r/&lt;slug&gt;</code>): 301 al destino + contador de clics.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Nueva redirección
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar por slug o URL de destino…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="true">Activos</SelectItem>
            <SelectItem value="false">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isError && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-center gap-2 rounded-lg border p-3 text-sm">
          <TriangleAlert className="size-4 shrink-0" />
          No se pudo cargar la lista de redirecciones: {query.error.message}
        </div>
      )}

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead className="text-right">Hits</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead>Actualizado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows === null &&
              !query.isError &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {rows !== null && rows.length === 0 && !query.isError && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                  {(() => {
                    // El mensaje se decide por `total` (lo que hay bajo el filtro
                    // actual en TODAS las páginas), no por `rows.length` de esta
                    // página: si `total > 0` no es que no haya ninguna, es que
                    // esta página se quedó sin filas (se está recortando `page`
                    // arriba) y decir "no hay ninguna" o "no coincide con el
                    // filtro" sería engañoso en los dos casos.
                    if (total > 0) return "Esta página ya no tiene redirecciones, volviendo a la anterior…";
                    if (debouncedSearch || activeFilter !== "todos")
                      return "No hay redirecciones que coincidan con el filtro.";
                    return "No hay redirecciones todavía. Crea la primera con «Nueva redirección».";
                  })()}
                </TableCell>
              </TableRow>
            )}

            {rows?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono font-semibold">
                  <span className="flex items-center gap-2">
                    <Link2 className="size-4 text-[#FF690B]" />
                    /r/{r.slug}
                  </span>
                </TableCell>
                <TableCell className="max-w-[320px]">
                  <a
                    href={r.target_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 truncate text-sm"
                    title={r.target_url}
                  >
                    <span className="truncate">{r.target_url}</span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.hits.toLocaleString("es-ES")}</TableCell>
                <TableCell>
                  <Badge variant={r.active ? "default" : "secondary"}>{r.active ? "Activo" : "Inactivo"}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{formatDate(r.created_at)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{formatDate(r.updated_at)}</TableCell>
                <TableCell className="text-right">
                  <CopyShortUrlButton slug={r.slug} />
                  <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(r)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Borrar" onClick={() => setDeletingRedirect(r)}>
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.max(1, p - 1));
                }}
                className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                {page} / {totalPages}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setPage((p) => Math.min(totalPages, p + 1));
                }}
                className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <RedirectFormDialog open={dialogOpen} onOpenChange={setDialogOpen} redirect={editingRedirect} />

      <AlertDialog open={deletingRedirect !== null} onOpenChange={(open) => !open && setDeletingRedirect(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar esta redirección?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Esta acción no se puede deshacer. Se eliminará permanentemente:</p>
              {deletingRedirect && (
                <p className="text-foreground font-mono font-semibold">/r/{deletingRedirect.slug}</p>
              )}
              <p>Cualquier enlace ya publicado con esta URL corta dejará de funcionar (404).</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Borrando…" : "Borrar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
