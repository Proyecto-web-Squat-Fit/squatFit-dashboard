"use client";

import { CircleAlert, CircleCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * «¿Este curso ya tiene una clase de muestra gratuita?» — de un vistazo,
 * para TODOS los cursos del listado, sin tener que abrir cada uno.
 *
 * Decisión de Hamlet (31-jul): la primera clase de cada curso pasa a ser
 * muestra gratuita para que la sección «Cursos» del panel del cliente
 * recién registrado tenga algo que enseñar sin haber comprado nada — en vez
 * de regalar un curso entero (que solo arreglaría esa sección y encima
 * regala un producto vendible). Eso solo funciona si TODOS los cursos
 * tienen una, así que lo que hace falta ver no es «marcar una clase», es
 * «cuáles no tienen ninguna todavía» — por eso esto vive en el LISTADO, no
 * solo dentro del editor de cada curso.
 *
 * ANTES esto llamaba a `useCurso` (GET course/detail/:id) por cada fila
 * visible, y lo dejaba documentado como compromiso consciente porque no
 * existía ningún endpoint de listado que trajera el dato. Desde el 3-ago sí
 * existe: `GET course/all` devuelve `free_sample_count`, así que la columna
 * ya no cuesta ni una petición — el dato viene en la misma fila.
 */
export function FreeSampleStatusCell({ count }: { count?: number }) {
  // `undefined` = este backend todavía no manda el recuento (instancia vieja).
  // «No se sabe» es distinto de «no tiene», y no hay que confundirlos como si
  // de repente ningún curso tuviera muestra.
  if (typeof count !== "number") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-muted-foreground gap-1 font-normal">
            No disponible
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          El backend de esta instancia todavía no manda cuántas clases son muestra gratuita en el listado de cursos.
        </TooltipContent>
      </Tooltip>
    );
  }

  if (count === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 border-amber-300 font-normal text-amber-700 dark:text-amber-400">
            <CircleAlert className="size-3" /> Sin muestra
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Ninguna clase de este curso está marcada todavía como muestra gratuita.</TooltipContent>
      </Tooltip>
    );
  }

  if (count === 1) {
    return (
      <Badge variant="outline" className="sqf-badge-green gap-1 font-normal">
        <CircleCheck className="size-3" /> 1 clase
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="gap-1 border-amber-300 font-normal text-amber-700 dark:text-amber-400">
          <CircleAlert className="size-3" /> {count} clases
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {count} clases marcadas como muestra gratuita en este curso. No está prohibido — puede ser deliberado —, pero
        confirma que lo es: lo habitual es una sola por curso.
      </TooltipContent>
    </Tooltip>
  );
}
