"use client";

import { useEffect, useState } from "react";

import { HeartCrack } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { LEAD_LOST_REASONS, LEAD_LOST_REASON_LABEL, type LeadLostReason } from "@/lib/services/leads-service";

interface LostReasonDialogProps {
  open: boolean;
  /** Nombre del lead que se está marcando como perdido (para el título). */
  leadName?: string;
  onConfirm: (reason: LeadLostReason) => void;
  onCancel: () => void;
}

/**
 * Mini-modal de motivo de pérdida (Bloque 1.3 CRM-GHL): aparece al arrastrar
 * una tarjeta a «Perdido» (o al elegir ese estado en la ficha). El motivo
 * alimenta la analítica del bloque 7; cancelar aborta el movimiento.
 */
export function LostReasonDialog({ open, leadName, onConfirm, onCancel }: LostReasonDialogProps) {
  const [reason, setReason] = useState<LeadLostReason>("precio");

  // Resetear la selección cada vez que se abre para un lead nuevo.
  useEffect(() => {
    if (open) setReason("precio");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartCrack className="size-5 text-rose-500" />
            ¿Por qué se pierde{leadName ? ` ${leadName}` : " este lead"}?
          </DialogTitle>
          <DialogDescription>
            El motivo alimenta los informes de pérdida (qué nos cuesta más ventas).
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={reason} onValueChange={(v) => setReason(v as LeadLostReason)} className="gap-2 py-1">
          {LEAD_LOST_REASONS.map((r) => (
            <Label
              key={r}
              htmlFor={`lost-${r}`}
              className="hover:bg-muted/60 has-[button[data-state=checked]]:border-primary flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm font-normal"
            >
              <RadioGroupItem id={`lost-${r}`} value={r} />
              {LEAD_LOST_REASON_LABEL[r]}
            </Label>
          ))}
        </RadioGroup>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(reason)}>
            Marcar como perdido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
