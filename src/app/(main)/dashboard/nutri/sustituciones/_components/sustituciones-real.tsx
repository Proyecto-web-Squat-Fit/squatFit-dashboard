"use client";
/* eslint-disable max-lines */

import { useCallback, useEffect, useState } from "react";

import { ArrowLeftRight, ExternalLink, Flag, Search, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlimentosAdminService,
  type AdminFood,
  type AdminFoodDetail,
  type FoodEsUsPair,
  type FoodSubstitution,
  type FoodUsEquivalence,
} from "@/lib/services/alimentos-admin-service";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function BuyLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
    >
      {label} <ExternalLink className="size-3" />
    </a>
  );
}

/** Pestaña 1: buscar un alimento y ver sus sustitutos (mismo grupo de kcal/categoría). */
function GruposTab() {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 400);
  const [results, setResults] = useState<AdminFood[] | null>(null);
  const [selected, setSelected] = useState<AdminFoodDetail | null>(null);

  useEffect(() => {
    if (!debounced.trim()) {
      setResults(null);
      return;
    }
    AlimentosAdminService.getFoods({ search: debounced, limit: 10 })
      .then((r) => setResults(r.data))
      .catch((e) => toast.error((e as Error).message));
  }, [debounced]);

  const pick = useCallback((id: string) => {
    setSelected(null);
    AlimentosAdminService.getFood(id)
      .then(setSelected)
      .catch((e) => toast.error((e as Error).message));
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">1. Busca un alimento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Ej. pechuga de pollo, arroz, yogur…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-col gap-1">
            {results?.map((f) => (
              <button
                key={f.id}
                onClick={() => pick(f.id)}
                className="hover:bg-muted flex items-center justify-between rounded px-2 py-1.5 text-left text-sm"
              >
                <span>{f.nombre}</span>
                <span className="text-muted-foreground text-xs">{f.macros_100g.kcal ?? "—"} kcal/100g</span>
              </button>
            ))}
            {results !== null && results.length === 0 && (
              <p className="text-muted-foreground py-4 text-center text-sm">Sin resultados.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">2. Sustitutos equivalentes</CardTitle>
        </CardHeader>
        <CardContent>
          {!selected && (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Elige un alimento a la izquierda para ver su grupo de sustitución.
            </p>
          )}
          {selected && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium">{selected.nombre}</p>
                {selected.grupo ? (
                  <p className="text-muted-foreground text-xs">
                    {selected.grupo.etiqueta} — misma categoría, densidad calórica parecida
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">Sin grupo de sustitución asignado.</p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {selected.sustitutos.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => pick(s.id)}
                    className="hover:bg-muted flex items-center justify-between rounded px-2 py-1.5 text-left text-sm"
                  >
                    <span>{s.nombre}</span>
                    <span className="text-muted-foreground text-xs">{s.macros_100g.kcal ?? "—"} kcal/100g</span>
                  </button>
                ))}
                {selected.sustitutos.length === 0 && (
                  <p className="text-muted-foreground py-4 text-center text-sm">No hay más alimentos en este grupo.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Pestaña 2: ~132 productos fit recomendados, con link de compra ES/US. */
function ProductosTab() {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 400);
  const [rows, setRows] = useState<FoodSubstitution[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    AlimentosAdminService.getSubstitutions({ search: debounced || undefined, limit: 100 })
      .then((r) => {
        setRows(r.data);
        setTotal(r.total);
      })
      .catch((e) => toast.error((e as Error).message));
  }, [debounced]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingBag className="size-4" /> {total} productos recomendados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar producto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>España</TableHead>
                <TableHead>EE. UU.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows === null &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {rows?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.nombre}</TableCell>
                  <TableCell>
                    {s.categoria && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        {s.categoria}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <BuyLink href={s.comprar_es} label="Comprar" />
                  </TableCell>
                  <TableCell>
                    <BuyLink href={s.comprar_us} label="Buy" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/** Pestaña 3: ~93 ingredientes de recetas USA → equivalente aprobado en España. */
function EquivalenciasTab() {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 400);
  const [rows, setRows] = useState<FoodUsEquivalence[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    AlimentosAdminService.getUsEquivalences({ search: debounced || undefined, limit: 100 })
      .then((r) => {
        setRows(r.data);
        setTotal(r.total);
      })
      .catch((e) => toast.error((e as Error).message));
  }, [debounced]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{total} ingredientes USA → España</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar ingrediente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingrediente (receta USA)</TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead>Equivalente en España</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows === null &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={3}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {rows?.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium capitalize">{e.ingrediente}</TableCell>
                  <TableCell>
                    <ArrowLeftRight className="text-muted-foreground size-4" />
                  </TableCell>
                  <TableCell>{e.equivalente}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/** Pestaña 4: ~392 pares "mismo producto" ES↔USA (selector de país). */
function ParesTab() {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 400);
  const [rows, setRows] = useState<FoodEsUsPair[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    AlimentosAdminService.getEsUsPairs({ search: debounced || undefined, limit: 100 })
      .then((r) => {
        setRows(r.data);
        setTotal(r.total);
      })
      .catch((e) => toast.error((e as Error).message));
  }, [debounced]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flag className="size-4" /> {total} pares ES ↔ USA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar producto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>🇪🇸 España</TableHead>
                <TableHead>🇺🇸 EE. UU.</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Comprar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows === null &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {rows?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.es_nombre ?? "—"}</TableCell>
                  <TableCell>{p.us_nombre ?? "—"}</TableCell>
                  <TableCell>
                    {p.categoria && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        {p.categoria}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2">
                    <BuyLink href={p.es_comprar} label="ES" />
                    <BuyLink href={p.us_comprar} label="US" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function SustitucionesReal() {
  return (
    <Tabs defaultValue="grupos" className="flex flex-col gap-4">
      <TabsList>
        <TabsTrigger value="grupos">Grupos de sustitución</TabsTrigger>
        <TabsTrigger value="productos">Productos recomendados</TabsTrigger>
        <TabsTrigger value="equivalencias">Equivalencias EEUU</TabsTrigger>
        <TabsTrigger value="pares">Pares ES-USA</TabsTrigger>
      </TabsList>
      <TabsContent value="grupos">
        <GruposTab />
      </TabsContent>
      <TabsContent value="productos">
        <ProductosTab />
      </TabsContent>
      <TabsContent value="equivalencias">
        <EquivalenciasTab />
      </TabsContent>
      <TabsContent value="pares">
        <ParesTab />
      </TabsContent>
    </Tabs>
  );
}
