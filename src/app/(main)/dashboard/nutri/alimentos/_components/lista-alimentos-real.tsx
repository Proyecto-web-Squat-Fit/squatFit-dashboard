"use client";
/* eslint-disable max-lines, complexity */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Apple, Search, ShieldAlert, Leaf } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlimentosAdminService,
  type AdminFood,
  type AdminFoodDetail,
  type FoodsMeta,
} from "@/lib/services/alimentos-admin-service";

const PAGE_SIZE = 50;

function frecuenciaVariant(f: string | null): "default" | "secondary" | "outline" {
  if (f === "Habitual") return "default";
  if (f === "Moderado") return "secondary";
  return "outline";
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function ListaAlimentosReal() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [familia, setFamilia] = useState<string>("todas");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminFood[] | null>(null);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState<FoodsMeta | null>(null);
  const [detail, setDetail] = useState<AdminFoodDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    AlimentosAdminService.getMeta()
      .then(setMeta)
      .catch((e) => toast.error(`No se pudo cargar el filtro de familias: ${(e as Error).message}`));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, familia]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const res = await AlimentosAdminService.getFoods({
        search: debouncedSearch || undefined,
        familia: familia === "todas" ? undefined : familia,
        page,
        limit: PAGE_SIZE,
      });
      if (id !== requestId.current) return; // respuesta obsoleta (búsqueda más reciente en vuelo)
      setRows(res.data);
      setTotal(res.total);
    } catch (e) {
      if (id !== requestId.current) return;
      toast.error(`No se pudieron cargar los alimentos: ${(e as Error).message}`);
      setRows([]);
      setTotal(0);
    }
  }, [debouncedSearch, familia, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = useCallback((id: string) => {
    setDetailOpen(true);
    setDetail(null);
    AlimentosAdminService.getFood(id)
      .then(setDetail)
      .catch((e) => toast.error((e as Error).message));
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const familiaOptions = useMemo(() => meta?.familias ?? [], [meta]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar por nombre (español o inglés)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={familia} onValueChange={setFamilia}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Familia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las familias</SelectItem>
            {familiaOptions.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {total.toLocaleString("es-ES")} alimentos{" "}
            {debouncedSearch || familia !== "todas" ? "encontrados" : "en la base"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[280px]">Alimento</TableHead>
                  <TableHead>Familia / Categoría</TableHead>
                  <TableHead>Dónde comprarlo</TableHead>
                  <TableHead className="text-right">Kcal /100g</TableHead>
                  <TableHead className="text-right">Prot.</TableHead>
                  <TableHead className="text-right">Carbs</TableHead>
                  <TableHead className="text-right">Grasas</TableHead>
                  <TableHead>Frecuencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows === null &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {rows !== null && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                      Sin resultados.
                    </TableCell>
                  </TableRow>
                )}
                {rows?.map((a) => (
                  <TableRow key={a.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => openDetail(a.id)}>
                    <TableCell className="font-medium">
                      {a.nombre}
                      {a.marca && <span className="text-muted-foreground ml-1 text-xs">· {a.marca}</span>}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{a.familia ?? "—"}</span>
                      {a.subcategoria && <div className="text-muted-foreground text-xs">{a.subcategoria}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {a.supermercados.slice(0, 2).map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs font-normal">
                            {s}
                          </Badge>
                        ))}
                        {a.supermercados.length > 2 && (
                          <Badge variant="outline" className="text-xs font-normal">
                            +{a.supermercados.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{a.macros_100g.kcal ?? "—"}</TableCell>
                    <TableCell className="text-right">{a.macros_100g.protes ?? "—"}g</TableCell>
                    <TableCell className="text-right">{a.macros_100g.carbos ?? "—"}g</TableCell>
                    <TableCell className="text-right">{a.macros_100g.grasas ?? "—"}g</TableCell>
                    <TableCell>
                      {a.frecuencia ? (
                        <Badge variant={frecuenciaVariant(a.frecuencia)} className="text-xs">
                          {a.frecuencia}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Apple className="size-5" /> {detail?.nombre ?? "Cargando…"}
            </SheetTitle>
            <SheetDescription>Información nutricional por 100 g</SheetDescription>
          </SheetHeader>
          {!detail && (
            <div className="mt-6 space-y-3 px-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
          {detail && (
            <div className="mt-4 space-y-6 px-4">
              <div className="flex flex-wrap gap-2">
                {detail.familia && <Badge variant="secondary">{detail.familia}</Badge>}
                {detail.categoria && <Badge variant="outline">{detail.categoria}</Badge>}
                {detail.frecuencia && <Badge variant={frecuenciaVariant(detail.frecuencia)}>{detail.frecuencia}</Badge>}
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <p className="mb-1 text-3xl font-bold">
                  {detail.macros_100g.kcal ?? "—"}{" "}
                  <span className="text-muted-foreground text-lg font-normal">kcal</span>
                </p>
                <p className="text-muted-foreground text-sm">por 100 gramos</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Proteínas</div>
                    <div className="font-medium">{detail.macros_100g.protes ?? "—"} g</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Carbohidratos</div>
                    <div className="font-medium">{detail.macros_100g.carbos ?? "—"} g</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Grasas</div>
                    <div className="font-medium">{detail.macros_100g.grasas ?? "—"} g</div>
                  </div>
                </div>
              </div>

              {detail.dietas.length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1 text-sm font-medium">
                    <Leaf className="size-4" /> Apto para
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {detail.dietas.map((d) => (
                      <Badge key={d} variant="outline" className="text-xs">
                        {d.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {detail.alergenos.length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1 text-sm font-medium">
                    <ShieldAlert className="size-4" /> Contiene
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {detail.alergenos.map((al) => (
                      <Badge key={al} variant="destructive" className="text-xs">
                        {al.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 text-sm">
                {detail.supermercados.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Dónde comprarlo: </span>
                    {detail.supermercados.join(", ")}
                  </div>
                )}
                {detail.uso_principal && (
                  <div>
                    <span className="text-muted-foreground">Uso principal: </span>
                    {detail.uso_principal}
                  </div>
                )}
                {detail.fuente && (
                  <div>
                    <span className="text-muted-foreground">Fuente del dato: </span>
                    {detail.fuente}
                  </div>
                )}
              </div>

              {detail.sustitutos.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-medium">Sustitutos ({detail.grupo?.etiqueta ?? "mismo grupo"})</p>
                  <div className="flex flex-col gap-1">
                    {detail.sustitutos.slice(0, 15).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => openDetail(s.id)}
                        className="hover:bg-muted flex items-center justify-between rounded px-2 py-1.5 text-left text-sm"
                      >
                        <span>{s.nombre}</span>
                        <span className="text-muted-foreground text-xs">{s.macros_100g.kcal ?? "—"} kcal</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
