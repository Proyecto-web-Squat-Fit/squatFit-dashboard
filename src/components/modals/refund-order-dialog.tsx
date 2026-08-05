"use client";

import { useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OrdersService, REFUND_REASONS, type RefundReason } from "@/lib/services/orders-service";

interface RefundOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pedido a reembolsar. */
  orderId: string;
  /** Referencia legible del pedido (nº o cliente) para el mensaje. */
  orderRef?: string;
  /** Total pagado, en euros. Sin él solo se puede reembolsar el importe completo. */
  orderTotal?: number;
  /** Ya devuelto de este pedido, en euros. El tope es lo que quede pendiente. */
  orderRefunded?: number;
  /** Callback tras un reembolso correcto (p. ej. refrescar la fila). */
  onRefunded?: () => void;
}

const eur = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

/**
 * Diálogo «Reembolsar pedido» (15.11): selector de MOTIVO obligatorio + nota
 * opcional. Envía `reason` (y la nota adjunta) a `POST orders/:id/refund`.
 * Reutilizable desde las acciones por fila del módulo de Pedidos (cuando exista)
 * o desde el detalle del pedido.
 */
export function RefundOrderDialog({
  open,
  onOpenChange,
  orderId,
  orderRef,
  orderTotal,
  orderRefunded = 0,
  onRefunded,
}: RefundOrderDialogProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<RefundReason | "">("");
  const [note, setNote] = useState("");
  const [parcial, setParcial] = useState(false);
  const [importe, setImporte] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Sin total conocido no se puede validar el tope, así que solo se ofrece el
  // reembolso completo: es preferible perder la opción a mandar a Stripe un
  // importe que no sabemos si cabe en el cobro.
  //
  // Y el tope NO es el total del pedido, es lo que QUEDA por devolver: a un
  // pedido con 40 € ya reembolsados no se le pueden devolver otros 80.
  const pendiente = Number(((orderTotal ?? 0) - orderRefunded).toFixed(2));
  const puedeSerParcial = typeof orderTotal === "number" && pendiente > 0;
  const importeNum = Number(importe.replace(",", "."));
  const importeValido = !parcial || (Number.isFinite(importeNum) && importeNum > 0 && importeNum <= pendiente);

  const reset = () => {
    setReason("");
    setNote("");
    setParcial(false);
    setImporte("");
    setSubmitting(false);
  };

  const handleConfirm = async () => {
    if (!reason) {
      toast.error("Selecciona un motivo de reembolso.");
      return;
    }
    if (parcial && !importeValido) {
      toast.error(`El importe debe estar entre 0 y ${eur(pendiente)}.`);
      return;
    }
    setSubmitting(true);
    try {
      const { message } = await OrdersService.refundOrder({
        orderId,
        reason,
        note,
        // Céntimos y redondeado: Stripe no admite fracciones de céntimo, y
        // 40,005 € se convertiría en un importe que su API rechaza.
        ...(parcial ? { amountCents: Math.round(importeNum * 100) } : {}),
      });
      toast.success(message || "Reembolso procesado");
      // Refresca cualquier vista de pedidos que dependa de este dato.
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      onRefunded?.();
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo procesar el reembolso");
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
            <Undo2 className="size-5" />
            Reembolsar pedido
          </DialogTitle>
          <DialogDescription>
            Indica el motivo del reembolso{orderRef ? ` del pedido ${orderRef}` : ""}. El motivo queda registrado en el
            pedido y, si el pago fue con tarjeta (Stripe), se ejecuta la devolución automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="refund-reason">
              Motivo <span className="text-destructive">*</span>
            </Label>
            <Select value={reason} onValueChange={(v: RefundReason) => setReason(v)}>
              <SelectTrigger id="refund-reason">
                <SelectValue placeholder="Selecciona un motivo…" />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {puedeSerParcial && (
            <div className="space-y-2">
              <Label>Importe</Label>
              {orderRefunded > 0 && (
                <p className="text-muted-foreground text-xs">
                  De los {eur(orderTotal)} de este pedido ya se devolvieron <strong>{eur(orderRefunded)}</strong>.
                  Quedan {eur(pendiente)}.
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={parcial ? "outline" : "secondary"}
                  className="flex-1"
                  onClick={() => setParcial(false)}
                >
                  Todo ({eur(pendiente)})
                </Button>
                <Button
                  type="button"
                  variant={parcial ? "secondary" : "outline"}
                  className="flex-1"
                  onClick={() => setParcial(true)}
                >
                  Parcial
                </Button>
              </div>
              {parcial && (
                <div className="space-y-1 pt-1">
                  <div className="relative">
                    <Input
                      id="refund-amount"
                      inputMode="decimal"
                      placeholder="0,00"
                      className="pr-8"
                      value={importe}
                      onChange={(e) => setImporte(e.target.value)}
                      autoFocus
                    />
                    <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-sm">€</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
                      onClick={() => setImporte((pendiente / 2).toFixed(2).replace(".", ","))}
                    >
                      Mitad ({eur(pendiente / 2)})
                    </button>
                    {importe && !importeValido && (
                      <span className="text-destructive text-xs">Máximo {eur(pendiente)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="refund-note">Nota (opcional)</Label>
            <Textarea
              id="refund-note"
              placeholder="Detalle interno del reembolso…"
              className="min-h-[80px] resize-none"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason || submitting || !importeValido}
            className="gap-2"
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {parcial && importeValido && importe ? `Reembolsar ${eur(importeNum)}` : "Confirmar reembolso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
