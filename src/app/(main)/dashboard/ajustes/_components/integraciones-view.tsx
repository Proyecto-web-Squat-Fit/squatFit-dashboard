"use client";

import { useState } from "react";

import {
  Activity,
  Calendar,
  CreditCard,
  Lock,
  Mail,
  MessageCircle,
  Package,
  ShieldCheck,
  Star,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/auth-context";

/**
 * INTEGRACIONES (reestructura 27-jul): panel de salud, solo admin y soporte.
 * Una tarjeta por integración con su fecha y un «Probar conexión» que llama al
 * route handler local /api/integrations/health/<nombre> (ping sin credenciales
 * a un endpoint público). Las que exigen credenciales del backend van con el
 * botón deshabilitado hasta que exista /admin-panel/integrations/health.
 */

interface Integracion {
  id: string;
  nombre: string;
  descripcion: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Mes de integración, o null si aún no está integrada. */
  integradaEl: string | null;
  /** true → se puede sondear sin credenciales desde el route handler local. */
  chequeable: boolean;
}

const INTEGRACIONES: Integracion[] = [
  {
    id: "stripe",
    nombre: "Stripe",
    descripcion: "Cobros del checkout, suscripciones y reembolsos.",
    icon: CreditCard,
    integradaEl: "junio 2026",
    chequeable: true,
  },
  {
    id: "bunny",
    nombre: "Bunny",
    descripcion: "Vídeo de los cursos (librerías y CDN).",
    icon: Video,
    integradaEl: "julio 2026",
    chequeable: true,
  },
  {
    id: "tidycal",
    nombre: "TidyCal",
    descripcion: "Reserva de llamadas del funnel de /programa.",
    icon: Calendar,
    integradaEl: "julio 2026",
    chequeable: true,
  },
  {
    id: "trustpilot",
    nombre: "Trustpilot",
    descripcion: "Reseñas verificadas mostradas en la web.",
    icon: Star,
    integradaEl: "julio 2026",
    chequeable: true,
  },
  {
    id: "correos",
    nombre: "Correos",
    descripcion: "Envíos de libros físicos y seguimiento.",
    icon: Package,
    integradaEl: null,
    chequeable: false,
  },
  {
    id: "sequra",
    nombre: "seQura",
    descripcion: "Pago fraccionado en el checkout.",
    icon: ShieldCheck,
    integradaEl: null,
    chequeable: false,
  },
  {
    id: "brevo",
    nombre: "Brevo",
    descripcion: "Email marketing y transaccional.",
    icon: Mail,
    integradaEl: null,
    chequeable: false,
  },
  {
    id: "whatsapp",
    nombre: "WhatsApp",
    descripcion: "Mensajería con clientes (futuro).",
    icon: MessageCircle,
    integradaEl: null,
    chequeable: false,
  },
];

interface HealthResult {
  ok: boolean;
  status?: number;
  latencyMs?: number;
  error?: string;
}

function IntegracionCard({ integracion }: { readonly integracion: Integracion }) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<HealthResult | null>(null);

  const probar = async () => {
    setChecking(true);
    setResult(null);
    try {
      const res = await fetch(`/api/integrations/health/${integracion.id}`);
      setResult((await res.json()) as HealthResult);
    } catch {
      setResult({ ok: false, error: "No se pudo lanzar el chequeo" });
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <integracion.icon className="size-5 text-[#363C98] dark:text-indigo-300" />
            <CardTitle className="text-base">{integracion.nombre}</CardTitle>
          </div>
          {integracion.integradaEl ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">Integrada</Badge>
          ) : (
            <Badge variant="secondary">Sin integrar aún</Badge>
          )}
        </div>
        <CardDescription>{integracion.descripcion}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-3">
        <p className="text-muted-foreground text-xs">
          {integracion.integradaEl
            ? `Integración realizada en ${integracion.integradaEl}.`
            : "Aparecerá aquí su salud cuando se integre."}
        </p>

        {result && (
          <p className={`text-xs font-medium ${result.ok ? "text-emerald-600" : "text-red-600"}`}>
            {result.ok
              ? `Conexión OK · ${result.latencyMs} ms`
              : `Fallo: ${result.error ?? `HTTP ${result.status}`}${result.latencyMs ? ` · ${result.latencyMs} ms` : ""}`}
          </p>
        )}

        {integracion.chequeable ? (
          <Button size="sm" variant="outline" onClick={probar} disabled={checking} className="w-fit">
            <Activity className="size-4" />
            {checking ? "Probando…" : "Probar conexión"}
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* span: el tooltip debe saltar aunque el botón esté deshabilitado */}
                <span className="w-fit">
                  <Button size="sm" variant="outline" disabled className="pointer-events-none">
                    <Lock className="size-4" />
                    Probar conexión
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-56">
                Se activa cuando el backend exponga /admin-panel/integrations/health
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}

export function IntegracionesView() {
  const { user, loading } = useAuth();
  const role = user?.role?.toLowerCase();
  const puedeVer = role === "admin" || role === "support" || role === "soporte";

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-44 w-full" />
        ))}
      </div>
    );
  }

  if (!puedeVer) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <Lock className="text-muted-foreground size-10" />
        <p className="text-lg font-semibold">Sección restringida</p>
        <p className="text-muted-foreground max-w-md text-sm">
          Integraciones solo está disponible para administración y soporte.
        </p>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Integraciones</h1>
        <p className="text-muted-foreground text-sm">
          Salud de los servicios externos conectados al sistema. Las que requieren configuración diaria tienen además su
          propia sección de trabajo; aquí solo se comprueba que responden.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {INTEGRACIONES.map((i) => (
          <IntegracionCard key={i.id} integracion={i} />
        ))}
      </div>
    </div>
  );
}
