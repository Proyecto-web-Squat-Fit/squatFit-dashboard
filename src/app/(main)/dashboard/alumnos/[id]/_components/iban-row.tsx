"use client";

import { useState } from "react";

import { Check, Copy, Eye, Landmark, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UsersService } from "@/lib/services/users-service";

/**
 * IBAN de un colaborador, en la ficha.
 *
 * QUÉ SE VE Y QUÉ NO. De entrada solo los cuatro últimos dígitos —lo justo para
 * reconocer la cuenta— y el número completo hay que pedirlo. No es teatro: el
 * back office se abre en pantallas compartidas y en reuniones, y un número de
 * cuenta a la vista de todos no hace falta para nada el 99% de las veces. Al
 * pedirlo, el servidor lo descifra y deja constancia de la consulta.
 *
 * QUIÉN LO VE. Solo el administrador, y solo en fichas de gente del equipo.
 * Las dos condiciones las comprueba también el servidor: esto es la interfaz,
 * no la cerradura.
 *
 * PARA QUÉ SIRVE. Para copiarlo y hacer la transferencia desde el banco. No hay
 * ningún botón que ordene un pago, aquí ni en el servidor.
 */
export function IbanRow({
  userId,
  ultimos4Iniciales,
}: {
  userId: string;
  ultimos4Iniciales?: string | null;
}) {
  const [ultimos4, setUltimos4] = useState<string | null>(ultimos4Iniciales ?? null);
  const [completo, setCompleto] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const revelar = async () => {
    setCargando(true);
    try {
      const iban = await UsersService.getIban(userId);
      setCompleto(iban);
      if (!iban) toast.info("Este colaborador no tiene IBAN guardado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo leer el IBAN.");
    } finally {
      setCargando(false);
    }
  };

  const copiar = async () => {
    if (!completo) return;
    try {
      await navigator.clipboard.writeText(completo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("El navegador no dejó copiar. Selecciónalo a mano.");
    }
  };

  const abrirEdicion = async () => {
    // Se edita sobre el número actual, no sobre un campo en blanco: casi
    // siempre el cambio es de un dígito, y volver a teclearlo entero es la
    // forma más fácil de introducir una errata nueva.
    if (!completo && ultimos4) await revelar();
    setBorrador(completo ?? "");
    setEditando(true);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const nuevos4 = await UsersService.setIban(userId, borrador.trim());
      setUltimos4(nuevos4);
      setCompleto(borrador.trim() ? borrador.trim().replace(/[\s-]/g, "").toUpperCase() : null);
      setEditando(false);
      toast.success(borrador.trim() ? "IBAN guardado." : "IBAN borrado.");
    } catch (error) {
      // El servidor rechaza el módulo 97 y las cuentas que no son de staff, y
      // su mensaje ya dice cuál de las dos cosas ha pasado.
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el IBAN.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 last:border-0">
      <span className="text-muted-foreground flex items-center gap-2 text-sm">
        <Landmark className="size-4" />
        IBAN
      </span>

      <div className="flex flex-wrap items-center justify-end gap-2 text-right text-sm font-medium">
        {editando ? (
          <>
            <Input
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              placeholder="ES91 2100 0418 4502 0005 1332"
              className="h-8 w-64 font-mono text-sm"
              autoFocus
            />
            <Button size="sm" className="h-8 gap-1.5" onClick={guardar} disabled={guardando}>
              {guardando ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Guardar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5"
              onClick={() => setEditando(false)}
              disabled={guardando}
            >
              <X className="size-3.5" />
            </Button>
          </>
        ) : (
          <>
            {completo ? (
              <span className="font-mono">{completo.replace(/(.{4})/g, "$1 ").trim()}</span>
            ) : ultimos4 ? (
              <span className="font-mono">•••• •••• {ultimos4}</span>
            ) : (
              <span className="text-muted-foreground">Sin IBAN</span>
            )}

            {ultimos4 && !completo && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5"
                onClick={revelar}
                disabled={cargando}
              >
                {cargando ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}
                Ver
              </Button>
            )}

            {completo && (
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={copiar}>
                {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copiado ? "Copiado" : "Copiar"}
              </Button>
            )}

            <Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={abrirEdicion}>
              <Pencil className="size-3.5" />
              {ultimos4 ? "Cambiar" : "Añadir"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
