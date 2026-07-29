"use client";

import { useEffect, useState } from "react";

import { CheckCircle2, ExternalLink, Loader2, Mail, Pencil, Truck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMarkShipmentDelivered,
  useOrderShipment,
  useRegisterShipment,
  useResendShipmentNotice,
  useUpdateShipment,
} from "@/hooks/use-orders";
import {
  CARRIER_LABEL,
  SHIPMENT_CARRIERS,
  shipmentEventLabel,
  type Order,
  type Shipment,
  type ShipmentCarrier,
} from "@/lib/services/orders-service";

/** `datetime-local` quiere 'YYYY-MM-DDTHH:mm' en hora local. */
function toLocalInput(iso?: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Ha fallado la operación");

interface ShipmentFormProps {
  orderId: string;
  /** Envío existente cuando el formulario abre en modo corrección. */
  shipment?: Shipment | null;
  onDone: () => void;
  onCancel?: () => void;
}

function ShipmentForm({ orderId, shipment, onDone, onCancel }: ShipmentFormProps) {
  const editing = Boolean(shipment);
  const [carrier, setCarrier] = useState<ShipmentCarrier>(shipment?.carrier ?? "correos_express");
  const [carrierName, setCarrierName] = useState(shipment?.carrierName ?? "");
  const [trackingNumber, setTrackingNumber] = useState(shipment?.trackingNumber ?? "");
  const [shippedAt, setShippedAt] = useState(toLocalInput(shipment?.shippedAt));
  const [trackingUrl, setTrackingUrl] = useState(shipment?.trackingUrl ?? "");
  const [notify, setNotify] = useState(!editing);
  const [reason, setReason] = useState("");

  const register = useRegisterShipment();
  const update = useUpdateShipment();
  const pending = register.isPending || update.isPending;

  const submit = () => {
    if (!trackingNumber.trim()) {
      toast.error("Falta el número de seguimiento");
      return;
    }
    if (carrier === "otro" && !carrierName.trim()) {
      toast.error("Indica el nombre del transportista");
      return;
    }
    const shippedIso = shippedAt ? new Date(shippedAt).toISOString() : undefined;

    if (editing) {
      update.mutate(
        {
          orderId,
          carrier,
          carrierName: carrier === "otro" ? carrierName : "",
          trackingNumber,
          shippedAt: shippedIso,
          trackingUrl: carrier === "otro" ? trackingUrl : undefined,
          notify,
          reason,
        },
        {
          onSuccess: () => {
            toast.success(notify ? "Envío corregido y cliente avisado" : "Envío corregido");
            onDone();
          },
          onError: (e) => toast.error(errorText(e)),
        },
      );
      return;
    }

    register.mutate(
      {
        orderId,
        carrier,
        carrierName: carrier === "otro" ? carrierName : undefined,
        trackingNumber,
        shippedAt: shippedIso,
        trackingUrl: carrier === "otro" ? trackingUrl : undefined,
        notify,
      },
      {
        onSuccess: () => {
          toast.success(notify ? "Envío registrado y cliente avisado" : "Envío registrado");
          onDone();
        },
        onError: (e) => toast.error(errorText(e)),
      },
    );
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="space-y-1.5">
        <Label htmlFor="carrier">Transportista</Label>
        <Select value={carrier} onValueChange={(v: ShipmentCarrier) => setCarrier(v)} disabled={pending}>
          <SelectTrigger id="carrier">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHIPMENT_CARRIERS.map((c) => (
              <SelectItem key={c} value={c}>
                {CARRIER_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {carrier === "otro" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="carrierName">Nombre del transportista</Label>
            <Input
              id="carrierName"
              placeholder="SEUR, GLS, MRW…"
              value={carrierName}
              onChange={(e) => setCarrierName(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trackingUrl">Enlace de seguimiento (opcional)</Label>
            <Input
              id="trackingUrl"
              placeholder="https://…"
              value={trackingUrl}
              onChange={(e) => setTrackingUrl(e.target.value)}
              disabled={pending}
            />
            <p className="text-muted-foreground text-xs">
              Sin enlace, el cliente recibe solo el número de seguimiento.
            </p>
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="trackingNumber">Número de seguimiento</Label>
        <Input
          id="trackingNumber"
          placeholder="0123456789012345"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          disabled={pending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="shippedAt">Fecha de envío</Label>
        <Input
          id="shippedAt"
          type="datetime-local"
          value={shippedAt}
          onChange={(e) => setShippedAt(e.target.value)}
          disabled={pending}
        />
      </div>

      {editing && (
        <div className="space-y-1.5">
          <Label htmlFor="reason">Motivo de la corrección (opcional)</Label>
          <Input
            id="reason"
            placeholder="Número mal tecleado"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={pending}
          />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={notify} onCheckedChange={(v) => setNotify(v === true)} disabled={pending} />
        {editing ? "Reenviar el aviso con el número corregido" : "Avisar al cliente por email"}
      </label>

      <div className="flex gap-2">
        <Button onClick={submit} disabled={pending} className="gap-2">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
          {editing ? "Guardar cambios" : "Registrar envío"}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Bloque «Envío» de la ficha del pedido.
 *
 * Correos tiene la API bloqueada, así que el equipo manda el paquete por su
 * cuenta y lo anota aquí: el pedido pasa a «Enviado» y el cliente recibe el
 * email con el nº de seguimiento. Los envíos dados de alta por API (cuando
 * Correos active el token) se muestran en solo lectura.
 */
export function OrderShipmentPanel({ order }: { order: Order }) {
  const { data: shipment, isLoading } = useOrderShipment(order.id);
  const [editing, setEditing] = useState(false);
  const markDelivered = useMarkShipmentDelivered();
  const resend = useResendShipmentNotice();

  // Al cambiar de pedido, cerrar el formulario abierto.
  useEffect(() => setEditing(false), [order.id]);

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  const header = (
    <div className="flex items-center gap-2 text-sm font-medium">
      <Truck className="size-4" /> Envío
    </div>
  );

  if (!shipment) {
    return (
      <div className="space-y-2">
        {header}
        <p className="text-muted-foreground text-xs">
          Anota aquí el envío que ha hecho el equipo. Al guardarlo, el pedido pasa a «Enviado» y el cliente recibe un
          email con el número de seguimiento.
        </p>
        <ShipmentForm orderId={order.id} onDone={() => setEditing(false)} />
      </div>
    );
  }

  const isManual = shipment.source === "manual";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {header}
        <span className="text-muted-foreground text-xs">{isManual ? "Registrado a mano" : "Alta en Correos"}</span>
      </div>

      <div className="space-y-1 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
        <p>
          <span className="text-muted-foreground">Transportista</span> {shipment.carrierLabel}
        </p>
        <p className="break-all">
          <span className="text-muted-foreground">Seguimiento</span> <strong>{shipment.trackingNumber ?? "—"}</strong>
        </p>
        <p>
          <span className="text-muted-foreground">Enviado</span> {formatDate(shipment.shippedAt)}
        </p>
        {shipment.deliveredAt && (
          <p>
            <span className="text-muted-foreground">Entregado</span> {formatDate(shipment.deliveredAt)}
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          {shipment.createdByName ? `Por ${shipment.createdByName} · ` : ""}
          {shipment.notifiedAt ? `Cliente avisado el ${formatDate(shipment.notifiedAt)}` : "Cliente sin avisar"}
        </p>
        {shipment.trackingUrl && (
          <a
            href={shipment.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#FF690B] hover:underline"
          >
            Ver seguimiento <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      {editing ? (
        <ShipmentForm
          orderId={order.id}
          shipment={shipment}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {isManual && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" /> Corregir
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={resend.isPending}
            onClick={() =>
              resend.mutate(
                { orderId: order.id },
                {
                  onSuccess: (r: any) => toast.success(r?.message ?? "Aviso reenviado"),
                  onError: (e) => toast.error(errorText(e)),
                },
              )
            }
          >
            {resend.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
            Reenviar aviso
          </Button>
          {!shipment.deliveredAt && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={markDelivered.isPending}
              onClick={() =>
                markDelivered.mutate(
                  { orderId: order.id },
                  {
                    onSuccess: () => toast.success("Pedido marcado como entregado"),
                    onError: (e) => toast.error(errorText(e)),
                  },
                )
              }
            >
              {markDelivered.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5 text-green-600" />
              )}
              Marcar entregado
            </Button>
          )}
        </div>
      )}

      {shipment.events.length > 0 && (
        <details className="text-xs">
          <summary className="text-muted-foreground cursor-pointer select-none">
            Historial del envío ({shipment.events.length})
          </summary>
          <ul className="mt-1.5 space-y-1">
            {shipment.events.map((e) => (
              <li key={e.id} className="text-muted-foreground">
                <span className="tabular-nums">{formatDate(e.createdAt)}</span> · {shipmentEventLabel(e)}
                {e.actorName ? ` · ${e.actorName}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
