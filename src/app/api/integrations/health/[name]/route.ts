import { NextRequest, NextResponse } from "next/server";

// ============================================================================
// Salud de integraciones (reestructura 27-jul)
// Chequeo simple SIN credenciales: ping a un endpoint público (status page o
// web principal) de cada servicio y medición de latencia. Para integraciones
// que exigen credenciales (Correos, seQura, Brevo, WhatsApp) el botón queda
// deshabilitado en la UI hasta que el backend exponga
// /admin-panel/integrations/health.
// ============================================================================

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 8000;

/** Endpoints públicos comprobables sin credenciales. */
const TARGETS: Record<string, string> = {
  stripe: "https://status.stripe.com/current",
  bunny: "https://status.bunny.net",
  tidycal: "https://tidycal.com",
  trustpilot: "https://www.trustpilot.com",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const url = TARGETS[name?.toLowerCase()];

  if (!url) {
    return NextResponse.json(
      { ok: false, error: `Integración desconocida o sin chequeo público: ${name}` },
      { status: 404 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = performance.now();

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "SquadFit-BackOffice-HealthCheck/1.0" },
    });
    const latencyMs = Math.round(performance.now() - started);
    // Cualquier respuesta < 500 demuestra que el servicio responde.
    return NextResponse.json({
      ok: res.status < 500,
      status: res.status,
      latencyMs,
      checkedAt: new Date().toISOString(),
    });
  } catch {
    const latencyMs = Math.round(performance.now() - started);
    return NextResponse.json({
      ok: false,
      status: 0,
      latencyMs,
      error: "Sin respuesta (timeout o error de red)",
      checkedAt: new Date().toISOString(),
    });
  } finally {
    clearTimeout(timeout);
  }
}
