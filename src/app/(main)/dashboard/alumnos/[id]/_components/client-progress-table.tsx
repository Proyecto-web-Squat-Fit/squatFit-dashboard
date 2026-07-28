"use client";

import { useMemo } from "react";

import { Ruler } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ClientProgress } from "@/lib/services/client-progress-service";

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES");

/**
 * Tabla de medidas por fecha de la pestaña Progreso.
 *
 * Las columnas NO están fijadas en el código: son las que el backend anuncia en
 * `fields`, porque la «Tabla progreso clientes» es una hoja de cálculo cuyo
 * esquema puede cambiar sin avisar. Si mañana aparece una columna «Gemelo»,
 * sale aquí sola.
 */
export function ClientProgressTable({ progress }: { progress: ClientProgress }) {
  // Más reciente primero: es el orden en el que el staff mira una ficha.
  const rows = useMemo(() => [...progress.records].reverse(), [progress.records]);

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
        <Ruler className="size-3.5" /> Medidas por fecha
      </p>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Fecha</TableHead>
              <TableHead className="whitespace-nowrap">Peso</TableHead>
              {progress.fields.map((f) => (
                <TableHead key={f} className="whitespace-nowrap">
                  {f}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium whitespace-nowrap">{fmtDate(r.recorded_on)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {r.weight_kg != null ? `${r.weight_kg} kg` : <span className="text-muted-foreground">—</span>}
                </TableCell>
                {progress.fields.map((f) => (
                  <TableCell key={f} className="whitespace-nowrap">
                    {/* Clave dinámica pero acotada: `f` sale de `progress.fields`,
                        que el backend construye con las claves de estos mismos
                        `data`. No hay entrada de usuario por medio. */}
                    {/* eslint-disable-next-line security/detect-object-injection */}
                    {r.data[f] || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {progress.fields.length === 0 && (
        <p className="text-muted-foreground text-xs">
          La hoja de este alumno solo trae fecha y peso: no hay columnas de medidas que mostrar.
        </p>
      )}
    </div>
  );
}
