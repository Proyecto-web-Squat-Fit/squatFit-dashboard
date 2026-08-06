"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AlertTriangle, Check, Copy, CreditCard, ExternalLink, Link2, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  agruparPorPlan,
  PaymentLinksService,
  type EnlaceDePago,
  type ResumenEnlacesDePago,
} from "@/lib/services/payment-links-service";

/**
 * Lo que pidió Hamlet el 1-ago: método de pago → plan → tipo de pago, y el
 * enlace listo para mandárselo al cliente en mitad de la llamada.
 *
 * Los enlaces se leen de Stripe en vivo. Lo que la pantalla añade encima es el
 * aviso que hoy no está en ninguna parte: la mayoría de estos enlaces COBRAN
 * SIN DAR ACCESO, porque no llevan metadata y el webhook no puede saber qué se
 * ha vendido. Cuando eso pasa hay que dar de alta al cliente a mano después.
 */

/** seQura sigue sin ofrecerse en la web (NEXT_PUBLIC_SEQURA_READY apagado). */
const METODOS = [
  { valor: "stripe", etiqueta: "Stripe", activo: true },
  { valor: "sequra", etiqueta: "seQura — todavía no", activo: false },
] as const;

/** El enlace elegido, con su aviso. Fuera de la página para que se lea. */
function ResultadoEnlace({
  enlace,
  copiado,
  onCopiar,
}: {
  enlace: EnlaceDePago;
  copiado: boolean;
  onCopiar: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link2 className="text-muted-foreground size-4 shrink-0" />
        <code className="text-sm break-all">{enlace.url}</code>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onCopiar} className="gap-2">
          {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copiado ? "Copiado" : "Copiar enlace"}
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <a href={enlace.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            Abrirlo para comprobarlo
          </a>
        </Button>
        {enlace.concede_acceso ? (
          <Badge variant="secondary" className="gap-1">
            <Check className="size-3" />
            Da acceso solo
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="size-3" />
            Cobra sin dar acceso
          </Badge>
        )}
      </div>

      <p className="text-muted-foreground text-sm">
        <strong>{enlace.nombre}</strong> · {enlace.modalidad}
        {enlace.producto && ` · ${enlace.producto.name}`}
      </p>

      {!enlace.concede_acceso && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Después del pago hay que darle de alta a mano</AlertTitle>
          <AlertDescription>
            A este enlace le falta {enlace.falta.join(" y ")}, así que el webhook no sabrá qué se ha vendido: no creará
            la cuenta ni concederá el producto. Ve a <strong>Usuarios → Dar de alta</strong> y luego asígnale lo que
            compró desde su ficha.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/** Carga y recarga de la lista. Aparte para que la página se lea de un vistazo. */
function useEnlacesDePago() {
  const [datos, setDatos] = useState<ResumenEnlacesDePago | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await PaymentLinksService.listar());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los enlaces.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return { datos, cargando, error, cargar };
}

export default function EnlacesDePagoPage() {
  const { datos, cargando, error, cargar } = useEnlacesDePago();
  const [metodo, setMetodo] = useState<string>("stripe");
  const [plan, setPlan] = useState<string>("");
  const [enlaceId, setEnlaceId] = useState<string>("");
  const [copiado, setCopiado] = useState(false);

  const grupos = useMemo(() => agruparPorPlan(datos?.enlaces ?? []), [datos]);
  const grupo = grupos.find((g) => g.plan === plan);
  const enlace: EnlaceDePago | undefined = grupo?.enlaces.find((e) => e.id === enlaceId);

  // Al cambiar de plan, el tipo de pago anterior ya no pertenece a este plan.
  const elegirPlan = (nuevo: string) => {
    setPlan(nuevo);
    const primero = grupos.find((g) => g.plan === nuevo)?.enlaces[0];
    setEnlaceId(primero?.id ?? "");
    setCopiado(false);
  };

  const copiar = async () => {
    if (!enlace) return;
    await navigator.clipboard.writeText(enlace.url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Enlaces de pago</h1>
        <p className="text-muted-foreground">
          Elige método, plan y tipo de pago, y copia el enlace para mandárselo al cliente.
        </p>
      </div>

      {datos && datos.no_conceden > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>
            {datos.no_conceden} de {datos.total} enlaces cobran sin dar acceso
          </AlertTitle>
          <AlertDescription>
            No llevan la metadata que necesita el webhook para saber qué se ha vendido, así que el cobro entra pero no
            se concede el producto ni se crea la cuenta. Cuando uses uno de esos, después del pago hay que dar de alta
            al cliente en <strong>Usuarios → Dar de alta</strong> y asignarle lo que compró.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" />
            Elegir enlace
          </CardTitle>
          <CardDescription>
            {cargando
              ? "Leyendo los enlaces activos de Stripe…"
              : datos
                ? `${datos.total} enlaces activos, leídos de Stripe ahora mismo.`
                : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription className="flex items-center gap-3">
                {error}
                <Button size="sm" variant="outline" onClick={() => void cargar()} className="gap-2">
                  <RefreshCw className="size-3" />
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {cargando ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Método de pago</label>
                <Select value={metodo} onValueChange={setMetodo}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METODOS.map((m) => (
                      <SelectItem key={m.valor} value={m.valor} disabled={!m.activo}>
                        {m.etiqueta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  seQura no se ofrece todavía en la web, así que no hay enlaces suyos que mandar.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Plan</label>
                <Select value={plan} onValueChange={elegirPlan}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elige el plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {grupos.map((g) => (
                      <SelectItem key={g.plan} value={g.plan}>
                        {g.plan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo de pago</label>
                <Select
                  value={enlaceId}
                  onValueChange={(v) => {
                    setEnlaceId(v);
                    setCopiado(false);
                  }}
                  disabled={!grupo}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={grupo ? "Elige el tipo de pago" : "Elige antes el plan"} />
                  </SelectTrigger>
                  <SelectContent>
                    {grupo?.enlaces.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.modalidad}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {enlace && <ResultadoEnlace enlace={enlace} copiado={copiado} onCopiar={() => void copiar()} />}
        </CardContent>
      </Card>
    </div>
  );
}
