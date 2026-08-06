"use client";

import { useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, PackagePlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GrantProductService, GrantableProduct, GrantableProductType } from "@/lib/services/grant-product-service";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<GrantableProductType, string> = {
  course: "Curso",
  book: "Libro",
  program: "Programa",
  pack: "Pack",
  product: "Producto",
};

interface GrantProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Usuario al que se asigna el producto. */
  userId: string;
  userName?: string;
  /** Contexto opcional: pedido desde el que se concede. */
  orderId?: string;
}

/**
 * Diálogo «Añadir producto» (13.12.1): selecciona un producto del catálogo y lo
 * asigna a un usuario (o a un pedido) con confirmación. Reutilizable desde
 * Usuarios y Pedidos. Llama a `POST /api/v1/admin-panel/grant-product` (ver la
 * guarda GRANT_PRODUCT_AVAILABLE en grant-product-service.ts).
 */
export function GrantProductDialog({ open, onOpenChange, userId, userName, orderId }: GrantProductDialogProps) {
  const [selected, setSelected] = useState<GrantableProduct | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: products = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["grantable-products"],
    queryFn: () => GrantProductService.getGrantableProducts(),
    enabled: open,
    staleTime: 60_000,
  });

  const reset = () => {
    setSelected(null);
    setPickerOpen(false);
    setSubmitting(false);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await GrantProductService.grantProduct({
        userId,
        productId: selected.id,
        productType: selected.type,
        orderId,
      });
      toast.success(`«${selected.name}» asignado${userName ? ` a ${userName}` : ""}`);
      // Refresca la ficha del cliente para que el nuevo acceso aparezca al momento.
      void queryClient.invalidateQueries({ queryKey: ["client-profile", userId] });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo asignar el producto");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="size-5" />
            Añadir producto
          </DialogTitle>
          <DialogDescription>
            Asigna un producto del catálogo{userName ? ` a ${userName}` : " al usuario"}
            {orderId ? " desde este pedido" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={pickerOpen}
                className="w-full justify-between"
                disabled={isLoading || !!error}
              >
                {selected ? (
                  <span className="truncate">
                    <span className="text-muted-foreground mr-2 text-xs">{TYPE_LABEL[selected.type]}</span>
                    {selected.name}
                  </span>
                ) : isLoading ? (
                  "Cargando catálogo…"
                ) : error ? (
                  "No se pudo cargar el catálogo"
                ) : (
                  "Selecciona un producto…"
                )}
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar producto…" />
                <CommandList>
                  <CommandEmpty>Sin resultados.</CommandEmpty>
                  <CommandGroup>
                    {products.map((p) => (
                      <CommandItem
                        key={`${p.type}-${p.id}`}
                        value={`${TYPE_LABEL[p.type]} ${p.name}`}
                        onSelect={() => {
                          setSelected(p);
                          setPickerOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 size-4", selected?.id === p.id ? "opacity-100" : "opacity-0")} />
                        <span className="text-muted-foreground mr-2 w-12 shrink-0 text-xs">{TYPE_LABEL[p.type]}</span>
                        <span className="truncate">{p.name}</span>
                        {typeof p.price === "number" && (
                          <span className="text-muted-foreground ml-auto pl-2 text-xs">{p.price} €</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selected && (
            <p className="text-muted-foreground text-sm">
              Se asignará <span className="text-foreground font-medium">{selected.name}</span> (
              {TYPE_LABEL[selected.type].toLowerCase()}).
              {/* Un programa concede MÁS que lo que dice su nombre, y quien pulsa
                  debería saberlo antes de pulsar: además de «Mi programa» entra
                  el curso incluido y, si es Premium, las sesiones en vivo. */}
              {selected.type === "program" && (
                <>
                  {" "}
                  Le dará acceso a «Mi programa», al curso que incluye y —si es Premium— a las sesiones
                  en vivo. La duración sale del propio producto (6 meses si no la trae).
                </>
              )}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selected || submitting}>
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Asignar producto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
