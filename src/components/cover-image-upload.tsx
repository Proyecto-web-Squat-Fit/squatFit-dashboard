"use client";

import { useEffect, useRef, useState } from "react";

import { X, Image as ImageIcon } from "lucide-react";

import { PhotoCropDialog } from "@/components/photo-crop-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CoverImageValue {
  /** Archivo nuevo elegido por el usuario (tiene prioridad sobre `url`). */
  file: File | null;
  /** URL pública de la portada (la que lee el carrito de la web). */
  url: string;
}

interface CoverImageUploadProps {
  value: CoverImageValue;
  onChange: (value: CoverImageValue) => void;
  disabled?: boolean;
  /** URL ya existente (modo edición) para mostrar como preview inicial. */
  initialPreviewUrl?: string | null;
  /** Rótulo del bloque. Por defecto, el de las portadas del catálogo. */
  titulo?: string;
  /** Vista previa redonda, para fotos de perfil. */
  redonda?: boolean;
  /**
   * Pasa la imagen elegida por un recorte cuadrado antes de subirla.
   *
   * Se activa en las FOTOS DE PERFIL y no en las portadas del catálogo: una
   * portada de libro es vertical y recortarla a cuadrado la destrozaría. Va en
   * su propia prop y no colgando de `redonda` para que la forma de la vista
   * previa y lo que se sube no queden atados sin querer.
   */
  conRecorte?: boolean;
  className?: string;
}

/**
 * Campo de imagen — subir archivo del ordenador o pegar URL, con vista previa.
 *
 * Nació para las portadas del catálogo, que se guardan en el mismo campo
 * `image` que el carrito de la web ya lee (libros/versiones/packs/cursos →
 * `storage.googleapis.com`), y sirve igual para la foto de perfil de un
 * empleado: lo único que cambia es el rótulo, la forma de la vista previa y a
 * qué endpoint manda el archivo quien lo use.
 */
export function CoverImageUpload({
  value,
  onChange,
  disabled,
  initialPreviewUrl,
  titulo = "Imagen de portada",
  redonda = false,
  conRecorte = false,
  className,
}: CoverImageUploadProps) {
  const [useUrl, setUseUrl] = useState(!!value.url && !value.file);
  const [preview, setPreview] = useState<string | null>(initialPreviewUrl ?? value.url ?? null);
  const [aRecortar, setARecortar] = useState<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Libera el object URL del archivo anterior para no fugar memoria.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const setFilePreview = (file: File | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setPreview(objectUrl);
    } else {
      setPreview(null);
    }
  };

  const handleFile = (file: File | null) => {
    setFilePreview(file);
    onChange({ file, url: "" });
  };

  /** Con recorte, la imagen elegida no se acepta hasta pasar por el diálogo. */
  const alElegirArchivo = (file: File | null) => {
    if (conRecorte && file) {
      setARecortar(file);
      return;
    }
    handleFile(file);
  };

  const handleUrl = (url: string) => {
    setPreview(url || null);
    onChange({ file: null, url });
  };

  const clear = () => {
    setFilePreview(null);
    setPreview(null);
    onChange({ file: null, url: "" });
  };

  return (
    <div className={cn("border-border/70 bg-background space-y-4 rounded-lg border p-4", className)}>
      <PhotoCropDialog
        file={aRecortar}
        onCancel={() => setARecortar(null)}
        onConfirm={(recortada) => {
          setARecortar(null);
          handleFile(recortada);
        }}
      />

      <p className="text-muted-foreground text-sm font-medium">{titulo}</p>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={!useUrl ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setUseUrl(false);
            handleUrl("");
          }}
          disabled={disabled}
        >
          Subir archivo
        </Button>
        <Button
          type="button"
          variant={useUrl ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setUseUrl(true);
            handleFile(null);
          }}
          disabled={disabled}
        >
          Usar URL
        </Button>
      </div>

      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-2">
          {!useUrl ? (
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                alElegirArchivo(e.target.files?.[0] ?? null);
                // Se limpia para que elegir el MISMO archivo dos veces seguidas
                // (por ejemplo tras cancelar el recorte) vuelva a disparar el
                // evento.
                e.target.value = "";
              }}
              disabled={disabled}
              className="cursor-pointer"
            />
          ) : (
            <Input
              type="url"
              placeholder="https://storage.googleapis.com/…/portada.png"
              value={value.url}
              onChange={(e) => handleUrl(e.target.value)}
              disabled={disabled}
            />
          )}
          <p className="text-muted-foreground text-xs">
            {useUrl
              ? "URL pública de la imagen."
              : conRecorte
                ? "JPG, PNG o WEBP (máx. 5 MB). Podrás encuadrarla antes de guardar."
                : "Formatos: JPG, PNG, WEBP (máx. 5 MB)."}
          </p>
        </div>

        <div
          className={cn("relative size-24 shrink-0 overflow-hidden border", redonda ? "rounded-full" : "rounded-lg")}
        >
          {preview ? (
            <>
              <img
                src={preview}
                alt="Vista previa"
                className="size-full object-cover"
                onError={() => setPreview(null)}
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={clear}
                disabled={disabled}
                className="absolute top-1 right-1 size-6"
                aria-label="Quitar imagen"
              >
                <X className="size-3.5" />
              </Button>
            </>
          ) : (
            <div className="text-muted-foreground flex size-full items-center justify-center">
              <ImageIcon className="size-7" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
