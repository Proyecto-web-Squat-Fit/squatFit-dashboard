"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Check, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

/**
 * Recorte de la foto de perfil: acercar, alejar y mover antes de subir.
 *
 * POR QUÉ EXISTE. El avatar es un círculo y la foto que sube la gente casi
 * nunca lo es: al encajarla con `object-cover` el navegador recorta por el
 * centro, que en una foto de cuerpo entero deja el ombligo y no la cara. Aquí
 * decide la persona qué parte se ve.
 *
 * Es el gemelo de `PhotoCropModal` del dashboard del cliente (misma mecánica,
 * los componentes de este panel). Si se corrige un cálculo aquí, hay que
 * corregirlo allí.
 *
 * SIN DEPENDENCIAS NUEVAS. Un `<img>` con `transform` dentro de una ventana con
 * `overflow: hidden` para la vista previa, y un `<canvas>` para el recorte
 * real.
 *
 * SALE CUADRADO Y MÁS LIGERO: JPEG de 512×512, que es el tamaño al que se ve un
 * avatar. Una foto de móvil de 4 MB acaba en unos cientos de KB.
 */

const VISTA = 288; // lado del recuadro de vista previa, en px
const SALIDA = 512; // lado de la imagen final, en px
const ZOOM_MAX = 4;

interface PhotoCropDialogProps {
  file: File | null;
  onCancel: () => void;
  onConfirm: (recortada: File) => void;
}

export function PhotoCropDialog({ file, onCancel, onConfirm }: PhotoCropDialogProps) {
  const [url, setUrl] = useState("");
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [procesando, setProcesando] = useState(false);

  const marcoRef = useRef<HTMLDivElement | null>(null);
  // Punteros activos: uno = arrastrar, dos = pellizcar para el zoom.
  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef<{ x?: number; y?: number; offset?: { x: number; y: number }; distancia?: number; zoom?: number } | null>(
    null,
  );

  // Cada foto nueva empieza centrada y sin zoom.
  useEffect(() => {
    if (!file) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    const imagen = new Image();
    imagen.onload = () => setImg(imagen);
    imagen.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  // Escala mínima: la que hace que la foto CUBRA el recuadro. Por debajo
  // aparecerían franjas vacías en el avatar.
  const escalaBase = img ? VISTA / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const escala = escalaBase * zoom;
  const anchoPintado = img ? img.naturalWidth * escala : 0;
  const altoPintado = img ? img.naturalHeight * escala : 0;

  /** Impide arrastrar la foto más allá de sus bordes. */
  const limitar = useCallback(
    (o: { x: number; y: number }, escalaActual: number) => {
      if (!img) return { x: 0, y: 0 };
      const maxX = Math.max(0, (img.naturalWidth * escalaActual - VISTA) / 2);
      const maxY = Math.max(0, (img.naturalHeight * escalaActual - VISTA) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, o.x)),
        y: Math.min(maxY, Math.max(-maxY, o.y)),
      };
    },
    [img],
  );

  const cambiarZoom = useCallback(
    (nuevo: number) => {
      const z = Math.min(ZOOM_MAX, Math.max(1, nuevo));
      setZoom(z);
      // Al alejar hay que recolocar: un desplazamiento que era válido puede
      // dejar un hueco con la foto más pequeña.
      setOffset((o) => limitar(o, escalaBase * z));
    },
    [escalaBase, limitar],
  );

  // ── Gestos ────────────────────────────────────────────────────────────────
  const distanciaEntrePunteros = () => {
    const [a, b] = [...punteros.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.current.size === 2) {
      gesto.current = { distancia: distanciaEntrePunteros(), zoom };
    } else {
      gesto.current = { x: e.clientX, y: e.clientY, offset };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!punteros.current.has(e.pointerId)) return;
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (punteros.current.size === 2 && gesto.current?.distancia) {
      const ahora = distanciaEntrePunteros();
      cambiarZoom((gesto.current.zoom ?? 1) * (ahora / gesto.current.distancia));
      return;
    }

    if (gesto.current?.offset) {
      const dx = e.clientX - (gesto.current.x ?? 0);
      const dy = e.clientY - (gesto.current.y ?? 0);
      setOffset(limitar({ x: gesto.current.offset.x + dx, y: gesto.current.offset.y + dy }, escala));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    punteros.current.delete(e.pointerId);
    gesto.current = null;
  };

  // La rueda no se puede escuchar con onWheel de React: ese listener es pasivo
  // y preventDefault no surte efecto, así que el diálogo se movería por debajo
  // mientras se hace zoom.
  useEffect(() => {
    const nodo = marcoRef.current;
    if (!nodo) return;
    const alGirar = (e: WheelEvent) => {
      e.preventDefault();
      cambiarZoom(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
    };
    nodo.addEventListener("wheel", alGirar, { passive: false });
    return () => nodo.removeEventListener("wheel", alGirar);
  }, [zoom, cambiarZoom, url]);

  // ── Recorte real ──────────────────────────────────────────────────────────
  const confirmar = () => {
    if (!img) return;
    setProcesando(true);

    // La ventana de vista previa, traducida a coordenadas de la imagen original.
    const esquinaX = VISTA / 2 + offset.x - anchoPintado / 2;
    const esquinaY = VISTA / 2 + offset.y - altoPintado / 2;
    const sx = -esquinaX / escala;
    const sy = -esquinaY / escala;
    const lado = VISTA / escala;

    const canvas = document.createElement("canvas");
    canvas.width = SALIDA;
    canvas.height = SALIDA;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setProcesando(false);
      return;
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, lado, lado, 0, 0, SALIDA, SALIDA);

    canvas.toBlob(
      (blob) => {
        setProcesando(false);
        if (!blob) return;
        onConfirm(new File([blob], "foto-perfil.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <Dialog open={!!file} onOpenChange={(abierto) => !abierto && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajusta la foto</DialogTitle>
          <DialogDescription>
            Arrastra para moverla. Pellizca, usa la rueda o la barra para acercarla.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-2">
          {/* El círculo es la guía de lo que se verá en el avatar; lo que se
              guarda es el cuadrado entero, que es lo que usan las tarjetas
              donde la foto no sale redonda. */}
          <div
            ref={marcoRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative cursor-grab touch-none overflow-hidden rounded-lg bg-slate-900 select-none active:cursor-grabbing"
            style={{ width: VISTA, height: VISTA, maxWidth: "100%" }}
          >
            {url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none"
                style={{
                  width: anchoPintado,
                  height: altoPintado,
                  left: VISTA / 2 + offset.x - anchoPintado / 2,
                  top: VISTA / 2 + offset.y - altoPintado / 2,
                }}
              />
            )}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at center, transparent 0, transparent 49.5%, rgba(15,23,42,0.55) 50%)",
              }}
            />
            <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/70" />
          </div>

          {/* Con ratón sin rueda no habría otra forma de acercar. */}
          <div className="flex w-full max-w-[288px] items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => cambiarZoom(zoom - 0.25)}
              aria-label="Alejar"
            >
              <Minus className="size-4" />
            </Button>
            <Slider
              value={[zoom]}
              min={1}
              max={ZOOM_MAX}
              step={0.01}
              onValueChange={([v]) => cambiarZoom(v)}
              aria-label="Acercar o alejar la foto"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => cambiarZoom(zoom + 0.25)}
              aria-label="Acercar"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmar} disabled={!img || procesando} className="gap-2">
            <Check className="size-4" />
            {procesando ? "Recortando…" : "Usar esta foto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
