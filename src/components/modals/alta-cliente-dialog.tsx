"use client";

import { useEffect, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usuariosDirectoryKeys } from "@/hooks/use-usuarios-directory";
import { AltaClienteService } from "@/lib/services/alta-cliente-service";

interface AltaClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Correo con el que abrir el formulario. Lo usa la pantalla de compradores
   * sin cuenta: allí el correo ya se conoce —viene del cobro de Stripe— y
   * hacer que se teclee otra vez es una oportunidad de equivocarse.
   */
  emailInicial?: string;
}

/**
 * Alta de un cliente que ya pagó por fuera de la web.
 *
 * El caso real que la motiva: quien compra por un enlace de pago de Stripe no
 * recibe nada —esos enlaces no llevan metadata, así que el webhook no sabe qué
 * conceder— y la campana avisa de que «hay que darle el alta y el acceso a
 * mano». Hasta el 6-ago-2026 no se podía: el panel no sabía crear clientes.
 *
 * El flujo completo son dos pasos, y este es el primero:
 *   1. aquí se le crea la cuenta
 *   2. en su ficha, «Asignar producto» → el programa que compró
 */
export function AltaClienteDialog({ open, onOpenChange, emailInicial }: AltaClienteDialogProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(emailInicial ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sendActivation, setSendActivation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emailValido = /.+@.+\..+/.test(email.trim());

  // Al reabrirlo para otro comprador tiene que traer SU correo, no el anterior.
  useEffect(() => {
    if (open) setEmail(emailInicial ?? "");
  }, [open, emailInicial]);

  const cerrarYLimpiar = () => {
    setEmail(emailInicial ?? "");
    setFirstName("");
    setLastName("");
    setSendActivation(false);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!emailValido || submitting) return;
    setSubmitting(true);
    try {
      const r = await AltaClienteService.crear({ email, firstName, lastName, sendActivation });

      // Se distingue a propósito entre crear y encontrar: decir «creado» cuando
      // la cuenta ya estaba haría pensar que se ha hecho algo que no se ha hecho.
      if (r.already_existed) {
        toast.info(r.message);
      } else {
        toast.success(r.message);
      }

      await queryClient.invalidateQueries({ queryKey: usuariosDirectoryKeys.all });
      cerrarYLimpiar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo dar de alta al cliente");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : cerrarYLimpiar())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Dar de alta a un cliente
          </DialogTitle>
          <DialogDescription>
            Para quien ya pagó por fuera de la web (un enlace de pago de Stripe, una transferencia…) y no tiene cuenta.
            Se le crea sin contraseña; después, en su ficha, se le asigna lo que compró.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="alta-email">Email</Label>
            <Input
              id="alta-email"
              type="email"
              placeholder="cliente@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
            <p className="text-muted-foreground text-xs">
              Si ese email ya tiene cuenta, no se toca nada: te lo diremos y podrás buscarla.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="alta-nombre">Nombre (opcional)</Label>
              <Input id="alta-nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alta-apellidos">Apellidos (opcional)</Label>
              <Input id="alta-apellidos" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="bg-muted/50 space-y-2 rounded-md p-3">
            <div className="flex items-start gap-2">
              <Checkbox
                id="alta-activacion"
                checked={sendActivation}
                onCheckedChange={(v) => setSendActivation(v === true)}
              />
              <Label htmlFor="alta-activacion" className="text-sm leading-snug font-normal">
                Mandarle ya el correo de «Crea tu contraseña»
              </Label>
            </div>
            {/* Apagado por defecto a propósito. Lo normal es alta → concederle lo
                que pagó → avisarle; al revés recibe un correo que no espera y
                entra a un panel vacío. */}
            <p className="text-muted-foreground text-xs">
              Normalmente <span className="font-medium">no</span>: primero se le asigna lo que compró y después se le
              avisa. Aunque no se lo mandes, puede entrar él solo en squadfit.es/login, escribir su email y recibir el
              enlace.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={cerrarYLimpiar} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!emailValido || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Dar de alta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
