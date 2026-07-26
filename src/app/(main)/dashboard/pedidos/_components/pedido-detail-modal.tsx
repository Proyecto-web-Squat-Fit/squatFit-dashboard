"use client";

import { useState } from "react";

import Link from "next/link";

import { Mail, ReceiptText, Truck, Undo2, UserRound } from "lucide-react";

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
import { useRefundPedido, useSendPedidoEmail } from "@/hooks/use-pedidos";
import type { Pedido } from "@/lib/services/pedidos-service";

import { downloadInvoice, downloadShippingInfo } from "./pedido-downloads";
import { formatPedidoDate, formatTotal, PaymentBadge, PedidoStatusBadge } from "./pedidos-shared";

/** Motivos de reembolso de la leyenda del diseño. */
const REFUND_REASONS = [
  "Equivocación",
  "Pausa/Baja",
  "Insatisfecho",
  "Completa con éxito",
  "Atrasos entrega",
  "Cambia tarifa",
];

export function PedidoDetailModal({
  pedido,
  open,
  onOpenChange,
}: {
  pedido: Pedido | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const sendEmail = useSendPedidoEmail();
  const refund = useRefundPedido();
  const [refundMode, setRefundMode] = useState(false);
  const [reason, setReason] = useState(REFUND_REASONS[0]);
  const [partialAmount, setPartialAmount] = useState("");

  if (!pedido) return null;

  const canRefund = (pedido.status === "completed" || pedido.status === "processing") && !refundMode;

  const handleRefund = async () => {
    const amount = parseFloat(partialAmount);
    await refund.mutateAsync({
      id: pedido.id,
      reason,
      amountCents: !Number.isNaN(amount) && amount > 0 ? Math.round(amount * 100) : undefined,
    });
    setRefundMode(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Pedido {pedido.shortId}
            <PedidoStatusBadge status={pedido.status} />
          </DialogTitle>
          <DialogDescription>{formatPedidoDate(pedido.createdAt)}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-muted-foreground text-xs">Cliente</p>
              <p className="font-medium">{pedido.customerName}</p>
              <p className="text-muted-foreground">{pedido.customerEmail}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Pago / Origen</p>
              <PaymentBadge method={pedido.paymentMethod} />
              <p className="text-muted-foreground mt-1">{pedido.origin}</p>
            </div>
          </div>

          {pedido.shippingAddress && (
            <div className="rounded-lg border border-[#EBEAF2] bg-[#FAFAFE] p-3">
              <p className="text-muted-foreground text-xs">Dirección de envío</p>
              <p className="font-medium">
                {[pedido.shippingAddress.firstName, pedido.shippingAddress.lastName].filter(Boolean).join(" ") ||
                  pedido.customerName}
              </p>
              <p>
                {[pedido.shippingAddress.address, pedido.shippingAddress.apartment].filter(Boolean).join(", ")}
                {" · "}
                {[pedido.shippingAddress.postalCode, pedido.shippingAddress.city].filter(Boolean).join(" ")}
                {pedido.shippingAddress.country ? ` · ${pedido.shippingAddress.country}` : ""}
              </p>
              {(pedido.shippingAddress.phone ?? pedido.shippingAddress.dni_cif) && (
                <p className="text-muted-foreground">
                  {[
                    pedido.shippingAddress.phone,
                    pedido.shippingAddress.dni_cif ? `DNI/CIF: ${pedido.shippingAddress.dni_cif}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
              {pedido.shippingAddress.notes && (
                <p className="text-muted-foreground italic">“{pedido.shippingAddress.notes}”</p>
              )}
            </div>
          )}

          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-[#EBEAF2] text-left text-[#363C98]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Producto</th>
                  <th className="px-3 py-2 font-semibold">Cant.</th>
                  <th className="px-3 py-2 text-right font-semibold">Precio</th>
                </tr>
              </thead>
              <tbody>
                {pedido.items.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="px-3 py-2">{i.product_name}</td>
                    <td className="px-3 py-2">{i.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {pedido.currency}
                      {parseFloat(i.unit_price).toFixed(2)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t font-semibold">
                  <td className="px-3 py-2">Total</td>
                  <td />
                  <td className="px-3 py-2 text-right tabular-nums">{formatTotal(pedido)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {pedido.refundReason && (
            <p className="text-sm text-[#9f4e63]">
              <strong>Motivo de la devolución:</strong> {pedido.refundReason}
            </p>
          )}

          {refundMode && (
            <div className="grid gap-3 rounded-lg border border-[#E8D8DE] bg-[#FFF7F2] p-3">
              <div className="grid gap-2">
                <Label>Motivo del reembolso</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue />
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
              <div className="grid gap-2">
                <Label>Importe parcial en € (vacío = reembolso total)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={pedido.total.toFixed(2)}
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                />
              </div>
              {!pedido.hasStripePayment && (
                <p className="text-muted-foreground text-xs">
                  Este pedido no tiene pago de Stripe (pago manual): se marcará como devuelto sin ejecutar reembolso.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setRefundMode(false)} disabled={refund.isPending}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-[#9f4e63] hover:bg-[#8a4256]"
                  onClick={handleRefund}
                  disabled={refund.isPending}
                >
                  {refund.isPending ? "Procesando..." : "Confirmar reembolso"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-start">
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link href="/dashboard/alumnos">
              <UserRound className="h-4 w-4" /> Ver cliente
            </Link>
          </Button>
          {pedido.status === "completed" && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => void downloadInvoice(pedido)}>
              <ReceiptText className="h-4 w-4" /> Factura PDF
            </Button>
          )}
          {pedido.status === "processing" && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => downloadShippingInfo(pedido)}>
              <Truck className="h-4 w-4" /> Info de envío
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => sendEmail.mutate({ id: pedido.id })}
            disabled={sendEmail.isPending}
          >
            <Mail className="h-4 w-4" /> Email de estado
          </Button>
          {canRefund && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 border-[#9f4e63] text-[#9f4e63]"
              onClick={() => setRefundMode(true)}
            >
              <Undo2 className="h-4 w-4" /> Reembolsar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
