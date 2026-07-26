"use client";

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Calendar,
  CreditCard,
  MessageSquareOff,
  ClipboardList,
  Ticket,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketingKPIs } from "@/hooks/use-marketing";

import { getMockKPIs } from "./data";

export function KPIOverviewCards() {
  const { data: kpis, isLoading, isError } = useMarketingKPIs();

  // Fallback a datos mock si hay error o mientras carga
  const kpisData = kpis || getMockKPIs();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatVariation = (value: number) => {
    const isPositive = value >= 0;
    return {
      text: `${isPositive ? "+" : ""}${value.toFixed(1)}%`,
      isPositive,
    };
  };

  const variacionMensual = formatVariation(kpisData.variacionMensual);
  const variacionAnual = formatVariation(kpisData.variacionAnual);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
        {/* Solo 2 cards: Asesorías y Ventas/Tareas (los que están conectados al backend) */}
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="sqf-metric-card @container/card">
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-8 w-32" />
            </CardHeader>
            <CardFooter>
              <Skeleton className="h-4 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
      {/* ========================================================================
 KPIS NO CONECTADOS AL BACKEND - COMENTADOS
 ======================================================================== */}

      {/* ❌ Ingresos Mensual - NO CONECTADO
 El backend NO calcula ingresos reales (no suma amount_value)
 Siempre muestra 0
 */}
      {/* <Card className="sqf-metric-card @container/card">
 <CardHeader>
 <CardDescription>Ingresos Mensual</CardDescription>
 <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
 {formatCurrency(kpisData.ingresosMensual)}
 </CardTitle>
 <CardAction>
 <Badge
 variant="outline"
 className={
 variacionMensual.isPositive
 ? "sqf-badge-green"
 : "sqf-badge-wine"
 }
 >
 {variacionMensual.isPositive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
 {variacionMensual.text}
 </Badge>
 </CardAction>
 </CardHeader>
 <CardFooter className="flex-col items-start gap-1.5 text-sm">
 <div className="line-clamp-1 flex gap-2 font-medium">
 <DollarSign className="size-4" />
 vs mes anterior
 </div>
 <div className="text-muted-foreground">Meta: {formatCurrency(25000)}</div>
 </CardFooter>
 </Card> */}

      {/* ❌ Ingresos Anual - NO CONECTADO
 El backend NO calcula ingresos reales (no suma amount_value)
 Siempre muestra 0
 */}
      {/* <Card className="sqf-metric-card @container/card">
 <CardHeader>
 <CardDescription>Ingresos Anual</CardDescription>
 <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
 {formatCurrency(kpisData.ingresosAnual)}
 </CardTitle>
 <CardAction>
 <Badge
 variant="outline"
 className={
 variacionAnual.isPositive
 ? "sqf-badge-green"
 : "sqf-badge-wine"
 }
 >
 {variacionAnual.isPositive ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
 {variacionAnual.text}
 </Badge>
 </CardAction>
 </CardHeader>
 <CardFooter className="flex-col items-start gap-1.5 text-sm">
 <div className="line-clamp-1 flex gap-2 font-medium">
 <DollarSign className="size-4" />
 vs año anterior
 </div>
 <div className="text-muted-foreground">Meta: {formatCurrency(300000)}</div>
 </CardFooter>
 </Card> */}

      {/* ✅ Asesorías - CONECTADO AL BACKEND */}
      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Asesorías</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {kpisData.asesoriasActivas}
            <span className="text-muted-foreground text-lg font-normal"> activas</span>
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-indigo">
              <Users className="size-4" />
              Total: {kpisData.asesoriasActivas + kpisData.asesoriasPausa + kpisData.asesoriasFinalizadas}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-4 font-medium">
            <span className="text-amber-600">{kpisData.asesoriasPausa} en pausa</span>
            <span className="text-muted-foreground">{kpisData.asesoriasFinalizadas} finalizadas</span>
          </div>
          <div className="text-muted-foreground">{kpisData.totalVentas} ventas totales</div>
        </CardFooter>
      </Card>

      {/* ✅ Ventas Totales - CONECTADO AL BACKEND */}
      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Ventas Totales</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {kpisData.totalVentas}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-wine">
              <TrendingUp className="size-4" />
              Este mes
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Libros, Cursos, Asesorías, Premium</div>
          <div className="text-muted-foreground">Ver desglose por producto</div>
        </CardFooter>
      </Card>

      {/* ❌ Renovación Próxima - NO CONECTADO
 Endpoint inexistente: GET /api/v1/admin-panel/marketing/clientes-renovacion
 Siempre muestra 0
 */}
      {/* <Card className="sqf-metric-card @container/card">
 <CardHeader>
 <CardDescription>Renovación Próxima (7 días)</CardDescription>
 <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
 {kpisData.clientesRenovacionProxima}
 </CardTitle>
 <CardAction>
 <Badge
 variant="outline"
 className="sqf-badge-orange"
 >
 <Calendar className="size-4" />
 Atención
 </Badge>
 </CardAction>
 </CardHeader>
 <CardFooter className="flex-col items-start gap-1.5 text-sm">
 <div className="line-clamp-1 flex gap-2 font-medium text-amber-600">
 <AlertTriangle className="size-4" />
 Requieren seguimiento
 </div>
 <div className="text-muted-foreground">Contactar antes de vencimiento</div>
 </CardFooter>
 </Card> */}

      {/* ❌ Falta Pago - NO CONECTADO
 Endpoint inexistente: GET /api/v1/admin-panel/marketing/clientes-falta-pago
 Siempre muestra 0
 */}
      {/* <Card className="sqf-metric-card @container/card">
 <CardHeader>
 <CardDescription>Clientes Falta Pago</CardDescription>
 <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
 {kpisData.clientesFaltaPago}
 </CardTitle>
 <CardAction>
 <Badge
 variant="outline"
 className={
 kpisData.clientesFaltaPago > 5
 ? "sqf-badge-wine"
 : "sqf-badge-orange"
 }
 >
 <CreditCard className="size-4" />
 {kpisData.clientesFaltaPago > 5 ? "Crítico" : "Pendiente"}
 </Badge>
 </CardAction>
 </CardHeader>
 <CardFooter className="flex-col items-start gap-1.5 text-sm">
 <div className="line-clamp-1 flex gap-2 font-medium">
 {kpisData.clientesFaltaPago > 0 ? (
 <span className="text-red-600">Gestión de cobros pendiente</span>
 ) : (
 "Todos los pagos al día"
 )}
 </div>
 <div className="text-muted-foreground">Ver detalle de deudas</div>
 </CardFooter>
 </Card> */}

      {/* ❌ Sin Contacto - NO CONECTADO
 Endpoint inexistente: GET /api/v1/admin-panel/marketing/clientes-sin-contacto
 Siempre muestra 0
 */}
      {/* <Card className="sqf-metric-card @container/card">
 <CardHeader>
 <CardDescription>Sin Contacto {">"}7 días</CardDescription>
 <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
 {kpisData.clientesSinContacto}
 </CardTitle>
 <CardAction>
 <Badge
 variant="outline"
 className={
 kpisData.clientesSinContacto > 10
 ? "sqf-badge-wine"
 : "sqf-badge-orange"
 }
 >
 <MessageSquareOff className="size-4" />
 Inactivos
 </Badge>
 </CardAction>
 </CardHeader>
 <CardFooter className="flex-col items-start gap-1.5 text-sm">
 <div className="line-clamp-1 flex gap-2 font-medium">
 {kpisData.clientesSinContacto > 0 ? (
 <span className="text-amber-600">Requieren contacto</span>
 ) : (
 "Todos contactados"
 )}
 </div>
 <div className="text-muted-foreground">Riesgo de abandono</div>
 </CardFooter>
 </Card> */}

      {/* ✅ Tareas y Tickets - CONECTADO AL BACKEND */}
      <Card className="sqf-metric-card @container/card">
        <CardHeader>
          <CardDescription>Tareas Pendientes / Tickets</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {kpisData.tareasPendientesTotal}
            <span className="text-muted-foreground text-lg font-normal"> / {kpisData.ticketsRecibidos}</span>
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="sqf-badge-wine">
              <ClipboardList className="size-4" />
              <Ticket className="size-4" />
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Por áreas: Nutrición, Entreno, Soporte</div>
          <div className="text-muted-foreground">Ver desglose detallado</div>
        </CardFooter>
      </Card>
    </div>
  );
}
