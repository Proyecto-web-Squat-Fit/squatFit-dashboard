"use client";

import { CircleAlert, CircleCheck, HelpCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurso } from "@/hooks/use-cursos";

/** Forma mínima de un vídeo tal como lo devuelve `GET course/detail/:id`. */
interface VideoConMuestra {
  video_is_free_sample?: boolean | null;
}

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
 * Usa `useCurso` (GET course/detail/:id), la MISMA query que ya dispara el
 * modal de edición — cacheada 5 min (`staleTime` del hook), así que si el
 * curso se acaba de abrir para editar esto no repite la petición. Se paga
 * con una petición por fila VISIBLE (la tabla pagina a 10 por defecto, así
 * que como mucho 10 en paralelo por página) a cambio de la visión de
 * conjunto que es el objetivo real de esta columna — no existe un
 * endpoint de listado que traiga este dato para todos los cursos a la vez.
 */
export function FreeSampleStatusCell({ cursoId }: { cursoId: string }) {
  const { data, isLoading, isError } = useCurso(cursoId);

  if (isLoading) {
    return <span className="text-muted-foreground text-xs">…</span>;
  }

  if (isError) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-muted-foreground gap-1 font-normal">
            <HelpCircle className="size-3" /> Error
          </Badge>
        </TooltipTrigger>
        <TooltipContent>No se ha podido comprobar: falló la carga del detalle de este curso.</TooltipContent>
      </Tooltip>
    );
  }

  const videos = (data?.videos ?? []) as VideoConMuestra[];

  // Si NINGÚN vídeo trae el campo (todos `undefined`), es que el backend de
  // esta instancia todavía no manda `video_is_free_sample` (PR #90 de
  // SquatFit, sin desplegar) — «no se sabe» es distinto de «no tiene», y no
  // hay que confundirlos como si de repente ningún curso tuviera muestra.
  const datoDisponible = videos.some((v) => typeof v.video_is_free_sample === "boolean");
  if (!datoDisponible) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-muted-foreground gap-1 font-normal">
            No disponible
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          El backend de esta instancia todavía no manda si una clase es muestra gratuita (PR #90 de SquatFit, abierto y
          sin desplegar).
        </TooltipContent>
      </Tooltip>
    );
  }

  const n = videos.filter((v) => v.video_is_free_sample === true).length;

  if (n === 0) {
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

  if (n === 1) {
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
          <CircleAlert className="size-3" /> {n} clases
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        {n} clases marcadas como muestra gratuita en este curso. No está prohibido — puede ser deliberado —, pero
        confirma que lo es: lo habitual es una sola por curso.
      </TooltipContent>
    </Tooltip>
  );
}
