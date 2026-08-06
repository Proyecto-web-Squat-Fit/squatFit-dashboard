"use client";

import { useCallback, useEffect, useState } from "react";

import { AlertTriangle, CalendarClock, Check, RefreshCw, ShieldOff, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  importeEnEuros,
  RefundDecisionsService,
  type DecisionPendiente,
} from "@/lib/services/refund-decisions-service";

/**
 * «Le he devuelto el dinero: ¿le quito el acceso?»
 *
 * Desde el 6-ago el webhook de Stripe ya no lo decide solo. Lo que llega aquí
 * son los reembolsos hechos DESDE STRIPE, que no traían decisión tomada. Los
 * lanzados desde el panel ya se preguntan en el propio diálogo de reembolso y
 * no pasan por esta pantalla.
 *
 * Mientras una fila está aquí, el cliente CONSERVA su acceso. Es lo prudente:
 * devolver de más es recuperable, quitarle a alguien lo que compró no.
 */

/** Por defecto, un mes: es el plazo típico de «déjaselo hasta que acabe». */
function dentroDeUnMes(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

function FilaPendiente({ fila, onResuelta }: { fila: DecisionPendiente; onResuelta: (detalle: string) => void }) {
  const [hasta, setHasta] = useState(dentroDeUnMes());
  const [trabajando, setTrabajando] = useState(false);

  const resolver = async (decision: "revocar" | "mantener" | "hasta_fecha") => {
    setTrabajando(true);
    try {
      const r = await RefundDecisionsService.resolver(fila.id, decision, hasta);
      toast.success(r.detalle || "Decisión aplicada");
      onResuelta(r.detalle);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo aplicar la decisión");
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-base font-semibold">Devuelto {importeEnEuros(fila.amount_refunded_cents, fila.currency)}</p>
        <p className="text-muted-foreground text-xs">{new Date(fila.created_at).toLocaleString("es-ES")}</p>
      </div>

      <p className="text-muted-foreground text-sm">
        {/* El `resumen` del backend YA nombra el pedido cuando lo hay, así que
            añadirlo aquí otra vez lo repetía: «Pedido abcdef12 · pedido
            abcdef12». Visto en el navegador. */}
        {fila.resumen ?? "Sin pedido trazable"}
        {!fila.user_id && " · no se sabe de qué cliente es"}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="destructive" disabled={trabajando} onClick={() => void resolver("revocar")} className="gap-2">
          <ShieldOff className="size-4" />
          Quitarle el acceso
        </Button>
        <Button variant="outline" disabled={trabajando} onClick={() => void resolver("mantener")} className="gap-2">
          <Check className="size-4" />
          Dejárselo
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={trabajando}
            onClick={() => void resolver("hasta_fecha")}
            className="gap-2"
          >
            <CalendarClock className="size-4" />
            Dejárselo hasta
          </Button>
          <Input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="w-40"
            aria-label="Fecha hasta la que mantener el acceso"
          />
        </div>
      </div>

      {!fila.order_id && (
        <p className="text-muted-foreground text-xs">
          Este cargo no tiene pedido asociado —los enlaces de pago no crean pedido—, así que «quitarle el acceso» no
          sabrá qué retirar: habrá que hacerlo desde su ficha.
        </p>
      )}
    </div>
  );
}

export default function ReembolsosPage() {
  const [datos, setDatos] = useState<DecisionPendiente[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await RefundDecisionsService.pendientes();
      setDatos(r.pendientes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los reembolsos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Reembolsos</h1>
        <p className="text-muted-foreground">
          Dinero ya devuelto que espera a que alguien diga qué pasa con el acceso del cliente.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Undo2 className="size-5" />
              Esperando decisión
            </CardTitle>
            <CardDescription>
              Mientras están aquí, el cliente <strong>conserva su acceso</strong>. Los reembolsos lanzados desde el
              panel no aparecen: allí se pregunta en el momento.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void cargar()} className="gap-2">
            <RefreshCw className="size-3" />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {cargando ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ) : datos && datos.length > 0 ? (
            datos.map((fila) => (
              <FilaPendiente
                key={fila.id}
                fila={fila}
                onResuelta={() => setDatos((prev) => (prev ?? []).filter((f) => f.id !== fila.id))}
              />
            ))
          ) : (
            !error && (
              <Alert>
                <Check className="size-4" />
                <AlertTitle>No hay nada pendiente</AlertTitle>
                <AlertDescription>
                  Cuando se devuelva un cobro desde Stripe, aparecerá aquí para que decidas qué pasa con su acceso.
                </AlertDescription>
              </Alert>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
