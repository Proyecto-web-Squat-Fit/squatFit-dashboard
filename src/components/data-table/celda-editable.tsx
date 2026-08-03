"use client";

import * as React from "react";

import { Check, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CLASE_CELDA_AJUSTADA } from "@/lib/formato-de-tablas";
import { cn } from "@/lib/utils";

/**
 * CELDA EDITABLE — una píldora de estado que se cambia EN LA PROPIA FILA, con un
 * clic, sin abrir ningún panel de edición (norma «formato de tablas», punto 3).
 *
 * Guarda al elegir, sin botón «guardar»: en una tabla de leads el equipo cambia
 * decenas de estados seguidos y un botón por celda haría el trabajo más lento que
 * la hoja de cálculo que esto viene a sustituir.
 *
 * Pinta el valor nuevo AL INSTANTE y lo revierte si el servidor lo rechaza
 * (actualización optimista). Sin esto la celda se queda con el valor viejo
 * mientras vuelve la petición y da la sensación de que el clic no ha hecho nada,
 * así que la gente vuelve a pulsar.
 */

export interface OpcionCelda {
  /** El valor que viaja al backend. */
  valor: string;
  /** Lo que ve la persona. Si no se pasa, se usa el propio valor. */
  etiqueta?: string;
  /** Clases de color de la píldora. Sin esto sale en gris. */
  clase?: string;
  /** Emoji o icono delante de la etiqueta (los closers tienen el suyo). */
  prefijo?: string;
}

interface CeldaEditableProps {
  /** Valor actual, o null si está sin asignar. */
  valor?: string | null;
  opciones: readonly OpcionCelda[];
  /** Guarda. Si lanza, la celda vuelve al valor anterior. */
  onGuardar: (nuevo: string | null) => Promise<unknown>;
  /** Texto de la píldora cuando no hay valor. */
  vacio?: string;
  /**
   * Permitir dejarla sin valor. Se ofrece como una opción más del desplegable
   * porque quitar un closer mal asignado es tan normal como ponerlo, y sin esto
   * la única salida sería abrir el panel del lead.
   */
  permiteVaciar?: boolean;
  /** Solo lectura: pinta la píldora sin desplegable (p. ej. rol sin permiso). */
  soloLectura?: boolean;
  className?: string;
}

const CLASE_VACIO = "bg-muted text-muted-foreground";

export function CeldaEditable({
  valor,
  opciones,
  onGuardar,
  vacio = "—",
  permiteVaciar = true,
  soloLectura = false,
  className,
}: CeldaEditableProps) {
  // `optimista` es lo que se pinta; `valor` es lo que dice el servidor. Se
  // separan para poder revertir.
  const [optimista, setOptimista] = React.useState<string | null | undefined>(undefined);
  const [guardando, setGuardando] = React.useState(false);

  // Si la fila se recarga con otro valor (otra persona lo cambió, o un refetch),
  // manda el del servidor y se descarta el optimista.
  React.useEffect(() => {
    setOptimista(undefined);
  }, [valor]);

  const actual = optimista !== undefined ? optimista : (valor ?? null);
  const opcion = opciones.find((o) => o.valor === actual);
  // No vale `actual ?? vacio`: `actual` puede ser cadena vacía (una fila antigua
  // con `''` en vez de NULL) y eso también tiene que salir como «sin valor».
  const etiqueta = opcion ? (opcion.etiqueta ?? opcion.valor) : actual ? actual : vacio;

  const elegir = async (nuevo: string | null) => {
    if (nuevo === actual) return;
    const anterior = actual;
    setOptimista(nuevo);
    setGuardando(true);
    try {
      await onGuardar(nuevo);
    } catch (error) {
      setOptimista(anterior);
      toast.error("No se pudo guardar el cambio", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  };

  // La píldora AJUSTA el texto en vez de cortarlo (norma «formato de tablas»):
  // llevaba `truncate`, y con la columna Pago a su ancho normal eso dejaba
  // «Sin cobrar» en «Sin cobra». Media palabra dentro de una píldora de estado
  // no se entiende, y encima la parte que se pierde es la que distingue un
  // estado de otro. Ahora la píldora crece hacia abajo, que es feo solo cuando
  // la columna está muy estrecha — y entonces es el usuario quien lo ha elegido.
  const pildora = (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        CLASE_CELDA_AJUSTADA,
        opcion?.clase ?? CLASE_VACIO,
        !opcion && "italic",
      )}
    >
      {opcion?.prefijo && <span aria-hidden>{opcion.prefijo}</span>}
      <span className={CLASE_CELDA_AJUSTADA}>{etiqueta}</span>
    </span>
  );

  if (soloLectura) return <span className={className}>{pildora}</span>;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "hover:bg-muted/60 focus-visible:ring-ring flex max-w-full cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
          className,
        )}
        // El texto del propio valor no basta como nombre accesible: en una tabla
        // hay decenas de «Realizada» y un lector de pantalla no sabría cuál es.
        aria-label={`Cambiar valor (actual: ${etiqueta})`}
      >
        {pildora}
        {guardando ? (
          <Loader2 className="text-muted-foreground size-3 shrink-0 animate-spin" />
        ) : (
          <ChevronDown className="text-muted-foreground size-3 shrink-0" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        {opciones.map((o) => (
          <DropdownMenuItem key={o.valor} onSelect={() => void elegir(o.valor)} className="gap-2">
            <Check className={cn("size-3.5", o.valor === actual ? "opacity-100" : "opacity-0")} />
            {o.prefijo && <span aria-hidden>{o.prefijo}</span>}
            <span>{o.etiqueta ?? o.valor}</span>
          </DropdownMenuItem>
        ))}
        {permiteVaciar && actual && (
          <DropdownMenuItem onSelect={() => void elegir(null)} className="text-muted-foreground gap-2">
            <Check className="size-3.5 opacity-0" />
            Quitar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
