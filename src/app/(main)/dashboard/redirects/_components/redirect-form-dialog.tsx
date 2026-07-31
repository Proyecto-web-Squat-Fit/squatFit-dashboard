"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { useCreateRedirect, useUpdateRedirect } from "@/hooks/use-redirects";
import type { Redirect } from "@/lib/services/redirects-service";

interface RedirectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si viene informado, el diálogo edita ese redirect; si no, crea uno nuevo. */
  redirect: Redirect | null;
}

interface FormState {
  slug: string;
  target_url: string;
  active: boolean;
}

const EMPTY_FORM: FormState = { slug: "", target_url: "", active: true };

/**
 * Un enlace corto solo cumple su función si es corto de compartir a mano
 * (WhatsApp, bio de Instagram, oral por telefono...). 60 caracteres da
 * margen de sobra para algo descriptivo («black-friday-2026-espana») sin
 * dejar de ser "corto"; si se supera, se recorta y se avisa en el formulario.
 */
const MAX_SLUG_LENGTH = 60;

/** Forma final aceptada: minúsculas/dígitos en bloques separados por un único guion, sin guion en los extremos. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Genera un slug válido para URL a partir de lo que escriba el admin:
 * minúsculas, sin acentos/diacríticos, espacios y símbolos → guion (colapsando
 * los repetidos), sin guiones ni barras sobrantes en los extremos, recortado
 * a MAX_SLUG_LENGTH. El backend no valida esto (DTO sin regex de slug), así
 * que la barrera útil está aquí: sin esto, un admin podría guardar
 * «año nuevo!» y el enlace corto quedaría roto (espacios/símbolos no son
 * válidos en una ruta).
 */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita los diacriticos (a con acento -> a, n con tilde -> n, etc.)
    .trim()
    .replace(/^\/+|\/+$/g, "") // barras en los extremos
    .replace(/[^a-z0-9]+/g, "-") // cualquier tramo no alfanumérico (espacios, símbolos, separadores) → un solo guion
    .replace(/^-+|-+$/g, "") // sin guion sobrante al principio/final
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, ""); // el recorte a MAX_SLUG_LENGTH puede dejar un guion colgando al final
}

export function RedirectFormDialog({ open, onOpenChange, redirect }: RedirectFormDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const createMutation = useCreateRedirect();
  const updateMutation = useUpdateRedirect();
  const isEditing = redirect !== null;
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        redirect ? { slug: redirect.slug, target_url: redirect.target_url, active: redirect.active } : EMPTY_FORM,
      );
      setError(null);
    }
  }, [open, redirect]);

  // El slug real que se va a guardar es siempre `slugify(form.slug)`, no lo
  // que hay literal en el input (que solo se normaliza al salir del campo):
  // este valor es el que se enseña en vivo en la previsualización y el que
  // decide si se puede guardar, para no guardar nunca algo distinto de lo
  // que el admin está viendo.
  const normalizedSlug = useMemo(() => slugify(form.slug), [form.slug]);
  const slugTyped = form.slug.trim().length > 0;
  const slugValid = normalizedSlug.length > 0 && SLUG_PATTERN.test(normalizedSlug);
  const slugTruncated = slugTyped && form.slug.trim().length > MAX_SLUG_LENGTH;
  const slugError =
    slugTyped && !slugValid
      ? "El slug queda vacío al quitar espacios, acentos y símbolos: escribe alguna letra o número."
      : null;
  const slugNotice = !slugError && slugTruncated ? `Se guardará recortado a ${MAX_SLUG_LENGTH} caracteres.` : null;
  const targetTyped = form.target_url.trim().length > 0;
  const canSubmit = slugValid && targetTyped && !isPending;

  const handleSubmit = async () => {
    const slug = normalizedSlug;
    const target = form.target_url.trim();
    if (!slug) {
      setError("El slug es obligatorio y debe tener alguna letra o número (sin espacios, acentos ni símbolos).");
      return;
    }
    if (!target) {
      setError("La URL de destino es obligatoria.");
      return;
    }
    setError(null);

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: redirect.id,
          data: { slug, target_url: target, active: form.active },
        });
      } else {
        await createMutation.mutateAsync({ slug, target_url: target, active: form.active });
      }
      onOpenChange(false);
    } catch (e) {
      // El toast de error ya lo dispara el hook (p. ej. slug duplicado → 400
      // del backend); aquí solo evitamos que el diálogo se cierre y dejamos
      // el mensaje también visible en el formulario.
      setError((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar redirección" : "Nueva redirección"}</DialogTitle>
          <DialogDescription>
            Pretty link corto (<code>squadfit.es/r/&lt;slug&gt;</code>) que redirige 301 a la URL de destino.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              placeholder="unete"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              // Al salir del campo se normaliza a un slug válido (sin acentos/espacios/
              // símbolos) para que lo que se ve ya sea lo que se va a guardar, y el
              // admin pueda seguir editándolo si quiere ajustarlo a mano.
              onBlur={() => setForm((f) => ({ ...f, slug: normalizedSlug }))}
              aria-invalid={slugTyped && !slugValid}
              disabled={isPending}
            />
            {slugTyped && (
              <p className={slugValid ? "text-muted-foreground text-xs" : "text-destructive text-xs"}>
                /r/{normalizedSlug || <span className="italic">slug</span>}
              </p>
            )}
            {slugError && <p className="text-destructive text-xs">{slugError}</p>}
            {slugNotice && <p className="text-muted-foreground text-xs">{slugNotice}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="target_url">URL de destino</Label>
            <Input
              id="target_url"
              placeholder="https://squadfit.es/programa"
              value={form.target_url}
              onChange={(e) => setForm((f) => ({ ...f, target_url: e.target.value }))}
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="active">Activo</Label>
              <p className="text-muted-foreground text-xs">
                Si se desactiva, <code>/r/{normalizedSlug || "…"}</code> deja de redirigir (404).
              </p>
            </div>
            <Switch
              id="active"
              checked={form.active}
              onCheckedChange={(active) => setForm((f) => ({ ...f, active }))}
              disabled={isPending}
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={!canSubmit}>
            {isPending ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear redirección"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
