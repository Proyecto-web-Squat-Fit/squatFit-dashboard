"use client";

import * as React from "react";

import { Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import type { OpcionCelda } from "./celda-editable";

/**
 * CELDA EDITABLE MÚLTIPLE — la hermana de `CeldaEditable` para cuando una fila
 * puede tener VARIOS valores a la vez (el primer caso: una persona del equipo
 * que es Trainer y Nutri).
 *
 * Mismas reglas que la de un solo valor (norma «formato de tablas», punto 3):
 * se edita en la propia fila con un clic, se guarda al elegir sin botón
 * «guardar», y el valor nuevo se pinta al instante y se revierte si el servidor
 * lo rechaza.
 *
 * Dos diferencias, ambas obligadas por ser múltiple:
 *
 * 1. El desplegable NO se cierra al marcar. Elegir dos roles seguidos son dos
 *    clics, no dos aperturas del menú; cerrarlo al primero convierte lo normal
 *    (varios valores) en lo incómodo.
 * 2. Se guarda la LISTA ENTERA en cada cambio, no el valor tocado. Así el
 *    llamante no tiene que saber si fue un alta o una baja, y el backend recibe
 *    siempre el estado final.
 */

interface CeldaEditableMultipleProps {
  /** Valores actuales. Lista vacía = sin ninguno. */
  valores: readonly string[];
  opciones: readonly OpcionCelda[];
  /** Guarda la lista completa. Si lanza, la celda vuelve a lo que había. */
  onGuardar: (nuevos: string[]) => Promise<unknown>;
  /** Texto de la píldora cuando no hay ningún valor. */
  vacio?: string;
  /** Solo lectura: pinta las píldoras sin desplegable (p. ej. sin permiso). */
  soloLectura?: boolean;
  /**
   * Cuántas píldoras se pintan antes de resumir el resto en un «+N». Sin esto,
   * una persona con los seis roles rompe el ancho de la columna.
   */
  maxVisibles?: number;
  className?: string;
}

const CLASE_VACIO = "bg-muted text-muted-foreground";

export function CeldaEditableMultiple({
  valores,
  opciones,
  onGuardar,
  vacio = "Sin asignar",
  soloLectura = false,
  maxVisibles = 3,
  className,
}: CeldaEditableMultipleProps) {
  // `optimista` es lo que se pinta; `valores` es lo que dice el servidor. Se
  // separan para poder revertir.
  const [optimista, setOptimista] = React.useState<string[] | null>(null);
  const [guardando, setGuardando] = React.useState(false);

  // Si la fila se recarga con otros valores (otra persona los cambió, o un
  // refetch), manda el servidor y se descarta el optimista. Se compara el
  // contenido y no la referencia: react-query devuelve un array nuevo en cada
  // render y comparar referencias tiraría el optimista antes de tiempo.
  const firma = valores.join(",");
  React.useEffect(() => {
    setOptimista(null);
  }, [firma]);

  const actuales = optimista ?? [...valores];
  const visibles = actuales.slice(0, maxVisibles);
  const ocultos = actuales.length - visibles.length;

  const guardar = async (siguientes: string[]) => {
    const anteriores = actuales;
    setOptimista(siguientes);
    setGuardando(true);
    try {
      await onGuardar(siguientes);
    } catch (error) {
      setOptimista(anteriores);
      toast.error("No se pudo guardar el cambio", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  };

  const alternar = (valor: string) => {
    const siguientes = actuales.includes(valor)
      ? actuales.filter((v) => v !== valor)
      : // Se reordena según la lista de opciones para que las píldoras salgan
        // siempre igual, sin depender del orden en que se marcaron.
        opciones.filter((o) => o.valor === valor || actuales.includes(o.valor)).map((o) => o.valor);
    void guardar(siguientes);
  };

  const pildora = (valor: string) => {
    const opcion = opciones.find((o) => o.valor === valor);
    return (
      <span
        key={valor}
        className={cn(
          "inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-xs font-medium",
          opcion?.clase ?? CLASE_VACIO,
        )}
      >
        {opcion?.prefijo && <span aria-hidden>{opcion.prefijo}</span>}
        <span className="truncate">{opcion?.etiqueta ?? valor}</span>
      </span>
    );
  };

  const pildoras = (
    <span className="flex flex-wrap items-center gap-1">
      {actuales.length === 0 ? (
        <span
          className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium italic", CLASE_VACIO)}
        >
          {vacio}
        </span>
      ) : (
        <>
          {visibles.map(pildora)}
          {ocultos > 0 && (
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", CLASE_VACIO)}>
              +{ocultos}
            </span>
          )}
        </>
      )}
    </span>
  );

  if (soloLectura) return <span className={className}>{pildoras}</span>;

  // El nombre accesible no puede ser el texto de las píldoras: en una tabla hay
  // decenas de «Trainer» y un lector de pantalla no sabría cuál es.
  const resumen = actuales.length ? actuales.join(", ") : "ninguno";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "hover:bg-muted/60 focus-visible:ring-ring flex max-w-full cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
          className,
        )}
        aria-label={`Cambiar valores (ahora: ${resumen})`}
      >
        {pildoras}
        {guardando ? (
          <Loader2 className="text-muted-foreground size-3 shrink-0 animate-spin" />
        ) : (
          <ChevronDown className="text-muted-foreground size-3 shrink-0" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        {opciones.map((o) => (
          <DropdownMenuItem
            key={o.valor}
            // `preventDefault` mantiene el menú abierto para poder marcar
            // varios seguidos (ver cabecera del fichero).
            onSelect={(evento) => {
              evento.preventDefault();
              alternar(o.valor);
            }}
            className="gap-2"
          >
            <Check className={cn("size-3.5", actuales.includes(o.valor) ? "opacity-100" : "opacity-0")} />
            {o.prefijo && <span aria-hidden>{o.prefijo}</span>}
            <span>{o.etiqueta ?? o.valor}</span>
          </DropdownMenuItem>
        ))}
        {actuales.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(evento) => {
                evento.preventDefault();
                void guardar([]);
              }}
              className="text-muted-foreground gap-2"
            >
              <Check className="size-3.5 opacity-0" />
              Quitar todos
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
