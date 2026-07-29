"use client";

import { useMemo } from "react";

import { CloudOff, Lock, RefreshCw, ScatterChart, TrendingDown, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientProgress } from "@/hooks/use-client-progress";
import {
  ClientProgressError,
  type ClientProgress,
  type ClientProgressSummary,
} from "@/lib/services/client-progress-service";

import { ClientProgressTable } from "./client-progress-table";

// Una sola serie (el peso): un único color, sin caja de leyenda — el título la
// nombra. El peso objetivo va como línea de referencia con etiqueta, NO como
// segunda serie, para no acabar en un gráfico de dos ejes.
const chartConfig = {
  weight_kg: { label: "Peso (kg)", color: "var(--chart-1)" },
} satisfies ChartConfig;

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES");
const fmtDateShort = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" });

/** Envoltorio común: todos los estados de la pestaña comparten cabecera. */
function SectionCard({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-5" /> Progreso
        </CardTitle>
        <CardDescription>Serie de peso, medidas e hitos de la Tabla progreso clientes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        {action}
      </CardContent>
    </Card>
  );
}

/** Aviso con icono para los estados que no son «hay datos». */
function Notice({
  icon,
  title,
  children,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  tone?: "neutral" | "warning";
}) {
  const box =
    tone === "warning" ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40" : "border-dashed";
  return (
    <div className={`flex items-start gap-3 rounded-md border p-4 ${box}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="space-y-1 text-sm">
        <p className="font-medium">{title}</p>
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

/**
 * Estados de error, cada uno con su mensaje. «Sin permiso» NUNCA se muestra
 * como «no hay datos»: es la confusión que ya se coló con los planes de
 * asesoría, y para el staff son cosas opuestas.
 */
function ProgressErrorState({ error, onRetry, retrying }: { error: Error; onRetry: () => void; retrying: boolean }) {
  const apiError = error instanceof ClientProgressError ? error : null;

  if (apiError?.isForbidden) {
    return (
      <SectionCard>
        <Notice
          tone="warning"
          icon={<Lock className="size-5 text-amber-700 dark:text-amber-400" />}
          title="No tienes permiso para ver el progreso"
        >
          Tu rol no puede consultar los datos de progreso de este alumno. Esto{" "}
          <strong>no significa que el alumno no tenga medidas</strong>: significa que el backend ha denegado la
          consulta. Si necesitas acceso, pídelo a un administrador.
        </Notice>
      </SectionCard>
    );
  }

  // 404: o la ruta aún no existe en el backend desplegado, o no hay tal alumno.
  if (apiError?.isNotFound) {
    return (
      <SectionCard>
        <div className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
          {/cannot get/i.test(error.message) ? (
            <p>
              El backend todavía no expone <code>GET /admin-panel/users/:id/progress</code>. La pestaña está lista y se
              rellenará sola en cuanto se despliegue el endpoint (PR <code>SquatFit#63</code>, pendiente de merge y
              despliegue).
            </p>
          ) : (
            <p>No se ha encontrado este alumno en el backend.</p>
          )}
        </div>
      </SectionCard>
    );
  }

  // Red, timeout, 500…
  return (
    <SectionCard
      action={
        <Button variant="outline" size="sm" className="gap-2" onClick={onRetry} disabled={retrying}>
          <RefreshCw className={`size-4 ${retrying ? "animate-spin" : ""}`} />
          Reintentar
        </Button>
      }
    >
      <Notice icon={<CloudOff className="text-muted-foreground size-5" />} title="No se ha podido cargar el progreso">
        {error.message}
        {apiError?.status ? ` (HTTP ${apiError.status})` : ""}. No sabemos si este alumno tiene medidas o no: la
        consulta ha fallado.
      </Notice>
    </SectionCard>
  );
}

/** «84.5 kg», o una raya si no hay dato. */
const kg = (v: number | null) => (v == null ? "—" : `${v} kg`);
/** Fecha formateada, o nada (los `hint` son opcionales). */
const hintDate = (iso: string | null) => (iso == null ? undefined : fmtDate(iso));

/** Variación de peso con su flecha: bajar es bueno, subir avisa. */
function DeltaValue({ delta }: { delta: number | null }) {
  if (delta == null) return <>—</>;
  return (
    <span className="flex items-center gap-1.5">
      {delta < 0 && <TrendingDown className="size-4 text-green-600" />}
      {delta > 0 && <TrendingUp className="size-4 text-amber-600" />}
      {delta > 0 ? "+" : ""}
      {delta} kg
    </span>
  );
}

/** Cabecera de cifras: inicial, último, variación y objetivo. */
function ProgressStats({ summary, lastImc }: { summary: ClientProgressSummary; lastImc: number | undefined }) {
  const stats: { label: string; value: React.ReactNode; hint?: string }[] = [
    {
      label: "Peso inicial",
      value: kg(summary.first_weight_kg),
      hint: hintDate(summary.first_recorded_on),
    },
    {
      label: "Último peso",
      value: kg(summary.last_weight_kg),
      hint: hintDate(summary.last_recorded_on),
    },
    {
      label: "Variación",
      value: <DeltaValue delta={summary.weight_delta_kg} />,
      hint: `${summary.total} registro${summary.total === 1 ? "" : "s"}`,
    },
    {
      label: "Objetivo",
      value: kg(summary.target_weight_kg),
      hint: lastImc == null ? undefined : `Último IMC ${lastImc}`,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-md border p-3">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">{s.label}</p>
          <p className="mt-1 text-xl font-semibold">{s.value}</p>
          {s.hint && <p className="text-muted-foreground mt-0.5 text-xs">{s.hint}</p>}
        </div>
      ))}
    </div>
  );
}

/** Gráfica de evolución del peso: una serie, un eje, tooltip al pasar. */
function WeightChart({ progress }: { progress: ClientProgress }) {
  // Solo los puntos con peso: un hueco en la hoja no debe dibujar un 0.
  const points = useMemo(
    () => progress.records.filter((r) => r.weight_kg !== null).map((r) => ({ ...r, weight_kg: r.weight_kg as number })),
    [progress.records],
  );

  if (points.length === 0) {
    return (
      <p className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
        Hay registros de progreso, pero ninguno trae el peso: no se puede dibujar la evolución. Las medidas sí están en
        la tabla de abajo.
      </p>
    );
  }
  if (points.length === 1) {
    return (
      <p className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
        Solo hay un pesaje ({fmtDate(points[0].recorded_on)}: {points[0].weight_kg} kg). Con un único punto no hay
        evolución que graficar todavía.
      </p>
    );
  }

  const target = progress.summary.target_weight_kg;

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
      <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="recorded_on"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={fmtDateShort}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={52} domain={["dataMin - 2", "dataMax + 2"]} />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(value) => fmtDate(String(value))} indicator="dot" />}
        />
        {target != null && (
          <ReferenceLine
            y={target}
            strokeDasharray="4 4"
            stroke="var(--muted-foreground)"
            label={{ value: `Objetivo ${target} kg`, position: "insideTopRight", fontSize: 11 }}
          />
        )}
        <Line
          dataKey="weight_kg"
          type="monotone"
          stroke="var(--color-weight_kg)"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartContainer>
  );
}

/**
 * Pestaña «Progreso» de la ficha del alumno (tablero F3, Back office nº 138).
 * Datos: GET /admin-panel/users/:id/progress — la Tabla progreso clientes
 * importada a `client_progress`, más el histórico de IMC.
 */
export function ClientProgressSection({ userId }: { userId: string }) {
  const { data, isLoading, error, refetch, isFetching } = useClientProgress(userId);

  if (isLoading) {
    return (
      <SectionCard>
        <div className="grid gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-[260px] w-full" />
        <Skeleton className="h-32 w-full" />
      </SectionCard>
    );
  }

  if (error) {
    return <ProgressErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />;
  }

  if (!data) return null;

  if (data.summary.total === 0) {
    return (
      <SectionCard>
        <Notice
          icon={<ScatterChart className="text-muted-foreground size-5" />}
          title="Este alumno todavía no tiene medidas registradas"
        >
          No aparece ninguna fila suya en la Tabla progreso clientes. En cuanto se registre el primer pesaje, la
          evolución y la tabla de medidas saldrán aquí.
        </Notice>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <ProgressStats summary={data.summary} lastImc={data.imc_history.at(-1)?.imc} />
      <WeightChart progress={data} />
      <ClientProgressTable progress={data} />
      {data.truncated && (
        <p className="text-muted-foreground text-xs">
          <Badge variant="outline" className="mr-1.5">
            Serie recortada
          </Badge>
          Se muestran los registros más recientes de {data.summary.total}. Los más antiguos se han omitido por el límite
          del endpoint; la variación de arriba sí está calculada sobre la serie completa.
        </p>
      )}
    </SectionCard>
  );
}
