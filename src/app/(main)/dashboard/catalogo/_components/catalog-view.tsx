"use client";

import { useMemo, useState } from "react";

import { AlertTriangle, Search, Pencil, Clock, Infinity as InfinityIcon } from "lucide-react";

import { BrandTabs } from "@/components/brand-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCatalogProducts } from "@/hooks/use-products-catalog";
import {
  GRANT_TYPE_LABEL,
  accessLabel,
  formatPrice,
  type GrantType,
  type Product,
} from "@/lib/services/products-service";

import { ProductGrantModal } from "./product-grant-modal";

const GRANT_BADGE_STYLE: Record<GrantType, string> = {
  course: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  program: "bg-[#EBEAF2] text-[#363C98] dark:bg-[#363C98]/30 dark:text-[#b9bce8]",
  book: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  pack: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200",
  digital_library: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200",
};

function GrantCell({ product }: { product: Product }) {
  if (product.grantType) {
    return <Badge className={GRANT_BADGE_STYLE[product.grantType]}>{GRANT_TYPE_LABEL[product.grantType]}</Badge>;
  }
  if (product.needsMapping) {
    return (
      <Badge className="gap-1 bg-[#FFEDE0] text-[#8a3d06] dark:bg-[#FF690B]/15 dark:text-[#FFB07A]">
        <AlertTriangle className="size-3" /> Sin mapear
      </Badge>
    );
  }
  return <span className="text-muted-foreground text-xs">Sin concesión</span>;
}

function AccessCell({ months }: { months: number | null }) {
  return (
    <Badge variant="outline" className="gap-1 font-normal">
      {months == null ? <InfinityIcon className="size-3" /> : <Clock className="size-3" />}
      {accessLabel(months)}
    </Badge>
  );
}

const VIEW_TABS = [
  { id: "todos", label: "Todos" },
  { id: "sin-mapear", label: "Sin mapear" },
  { id: "mapeados", label: "Mapeados" },
];

export function CatalogView() {
  const { data: products = [], isLoading } = useCatalogProducts();
  const [tab, setTab] = useState("todos");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const needMappingCount = useMemo(() => products.filter((p) => p.needsMapping).length, [products]);

  const visible = useMemo(() => {
    let out = products;
    if (tab === "sin-mapear") out = out.filter((p) => p.needsMapping);
    else if (tab === "mapeados") out = out.filter((p) => p.grantType);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((p) => p.name.toLowerCase().includes(q) || (p.area ?? "").toLowerCase().includes(q));
    }
    // Los que necesitan mapeo, primero; luego por precio DESC.
    return [...out].sort((a, b) => Number(b.needsMapping) - Number(a.needsMapping) || b.price - a.price);
  }, [products, tab, search]);

  const openEdit = (product: Product) => {
    setSelected(product);
    setModalOpen(true);
  };

  const tabs = VIEW_TABS.map((t) =>
    t.id === "sin-mapear" && needMappingCount > 0 ? { ...t, label: `Sin mapear · ${needMappingCount}` } : t,
  );

  return (
    <div className="@container/main flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Catálogo</h1>
        <p className="text-muted-foreground text-sm">
          Qué concede cada producto al comprarse (curso, libro, pack, biblioteca o programa) y su tramo de acceso.
        </p>
      </div>

      {needMappingCount > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-dashed border-[#FF690B]/40 bg-[#FFEDE0]/50 px-4 py-2.5 text-sm text-[#8a3d06] dark:bg-[#FF690B]/10 dark:text-[#ffa266]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong>{needMappingCount}</strong> {needMappingCount === 1 ? "producto tiene" : "productos tienen"} precio
            pero <strong>ninguna concesión</strong>: al comprarlos no se da acceso a nada. Asigna su curso/libro/pack en
            «Editar».
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
          <Input
            placeholder="Buscar por nombre o área…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <BrandTabs tabs={tabs} active={tab} onChange={setTab} />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#EBEAF2]/60 hover:bg-[#EBEAF2]/60 dark:bg-[#363C98]/25 dark:hover:bg-[#363C98]/25">
                    <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Producto</TableHead>
                    <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Tipo</TableHead>
                    <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Precio</TableHead>
                    <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Tramo</TableHead>
                    <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Concede</TableHead>
                    <TableHead className="text-[#363C98] dark:text-[#b9bce8]">Estado</TableHead>
                    <TableHead className="text-right text-[#363C98] dark:text-[#b9bce8]">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                        No hay productos que coincidan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visible.map((p) => (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-[#FFEDE0]/40 dark:hover:bg-[#FF690B]/10"
                        onClick={() => openEdit(p)}
                      >
                        <TableCell className="font-medium">
                          {p.name}
                          {p.area && <span className="text-muted-foreground ml-2 text-xs">· {p.area}</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{p.type}</TableCell>
                        <TableCell>{formatPrice(p.price, p.currency)}</TableCell>
                        <TableCell>
                          <AccessCell months={p.accessMonths} />
                        </TableCell>
                        <TableCell>
                          <GrantCell product={p} />
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={p.active ? "border-green-300 text-green-700" : "text-muted-foreground"}
                          >
                            {p.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(p);
                            }}
                          >
                            <Pencil className="size-3.5" />
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <ProductGrantModal product={selected} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
