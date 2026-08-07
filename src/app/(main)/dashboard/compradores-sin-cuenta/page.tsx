"use client";

import { useCallback, useEffect, useState } from "react";

import { AlertTriangle, Check, RefreshCw, UserPlus } from "lucide-react";

import { AltaClienteDialog } from "@/components/modals/alta-cliente-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CompradoresSinCuentaService,
  enEuros,
  type CompradorSinCuenta,
  type ResumenCompradoresSinCuenta,
} from "@/lib/services/compradores-sin-cuenta-service";

/**
 * Pagaron y no existen en la base.
 *
 * Un enlace de pago sin metadata cobra, no concede nada y tampoco crea la
 * cuenta. Hasta ahora esto solo se veía corriendo un script a mano, y aunque se
 * viera no se podía resolver: nadie sabía QUÉ había comprado esa persona.
 *
 * Cada fila trae el enlace por el que entró, que es el dato que lo dice. Y el
 * botón abre el alta con su correo ya puesto.
 */
function Fila({ c, onAlta }: { c: CompradorSinCuenta; onAlta: (email: string) => void }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4">
      <div className="min-w-0 space-y-1">
        <p className="text-base font-semibold break-all">{c.email}</p>
        <p className="text-muted-foreground text-sm">
          {c.fecha} · {enEuros(c.importe, c.moneda)}
          {c.enlace?.nombre && ` · «${c.enlace.nombre}»`}
        </p>
        {c.producto ? (
          <Badge variant="secondary" className="gap-1">
            <Check className="size-3" />
            {c.producto}
          </Badge>
        ) : c.enlace ? (
          <p className="text-muted-foreground text-xs">
            El enlace no lleva metadata, así que el sistema no sabe qué producto es. El concepto de arriba es lo único
            que hay para decidirlo.
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">
            No se ha podido trazar por qué enlace entró: puede ser un cobro hecho a mano o desde otra vía.
          </p>
        )}
      </div>
      <Button onClick={() => onAlta(c.email)} className="gap-2">
        <UserPlus className="size-4" />
        Darle de alta
      </Button>
    </div>
  );
}

export default function CompradoresSinCuentaPage() {
  const [datos, setDatos] = useState<ResumenCompradoresSinCuenta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [altaDe, setAltaDe] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await CompradoresSinCuentaService.listar());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la lista.");
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
        <h1 className="text-2xl font-bold tracking-tight">Pagaron y no tienen cuenta</h1>
        <p className="text-muted-foreground">
          Cobros que entraron sin crear la cuenta del cliente, porque el enlace de pago no lleva metadata.
        </p>
      </div>

      {datos && datos.sin_cuenta > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>
            {datos.sin_cuenta} cobros por {enEuros(datos.importe_total, "EUR")} sin cuenta
            {/* Cobros ≠ personas: quien paga a plazos sale una vez por plazo.
                El 7-ago eran 19 cobros de 12 personas, con un correo repetido
                cuatro veces. Sin decirlo, se da de alta a la misma persona
                cuatro veces. Solo se añade si el backend lo manda: mientras no
                esté desplegado, llega undefined y esto no se pinta. */}
            {typeof datos.personas === "number" && datos.personas !== datos.sin_cuenta && (
              <> · son {datos.personas} personas</>
            )}
          </AlertTitle>
          <AlertDescription>
            De {datos.cobros_mirados} cobros de los últimos {datos.dias} días. Esta gente ha pagado y no puede entrar:
            hay que darle de alta y concederle lo que compró desde su ficha.
            {typeof datos.personas === "number" && datos.personas !== datos.sin_cuenta && (
              <> Ojo: hay correos repetidos, porque quien paga a plazos sale una vez por plazo. Dale de alta una sola vez.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Sin cuenta</CardTitle>
            <CardDescription>
              El concepto del enlace es lo que dice qué compró cada uno. No se deduce del importe: 797 € es tanto
              Entreno como Nutrición.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void cargar()} className="gap-2">
            <RefreshCw className="size-3" />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {cargando ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : datos && datos.compradores.length > 0 ? (
            datos.compradores.map((c) => <Fila key={c.charge_id} c={c} onAlta={setAltaDe} />)
          ) : (
            !error && (
              <Alert>
                <Check className="size-4" />
                <AlertTitle>Nadie se ha quedado fuera</AlertTitle>
                <AlertDescription>Todos los cobros de la ventana mirada tienen su cuenta en la base.</AlertDescription>
              </Alert>
            )
          )}
        </CardContent>
      </Card>

      <AltaClienteDialog
        open={altaDe !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setAltaDe(null);
            // Al cerrar se recarga: si acaba de crearse la cuenta, esa fila ya
            // no pertenece a esta lista y quedarse ahí invita a repetir el alta.
            void cargar();
          }
        }}
        emailInicial={altaDe ?? undefined}
      />
    </div>
  );
}
