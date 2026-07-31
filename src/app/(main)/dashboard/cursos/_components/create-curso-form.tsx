"use client";

import { useState } from "react";

import { X, FileVideo, Upload, Link2, Trash2, Edit2, Gift, Loader2, CircleAlert } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { CoverImageUpload } from "@/components/cover-image-upload";
import { InstructorSelect } from "@/components/forms/instructor-select";
import {
  ProductDeliveryFields,
  PRODUCT_DELIVERY_SUPPORTED,
  type ProductDeliveryValue,
} from "@/components/product-delivery-fields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceInput } from "@/components/ui/price-input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteCursoVideo, useToggleCursoVideoFreeSample, useUpdateCursoVideoMetadata } from "@/hooks/use-cursos";

import { CreateCursoFormValues } from "./create-curso-schema";

interface CreateCursoFormProps {
  form: UseFormReturn<CreateCursoFormValues>;
  onSubmit: (values: CreateCursoFormValues) => void;
  isLoading?: boolean;
  onCancel: () => void;
  submitLabel?: string;
  loadingLabel?: string;
  currentVideos?: Array<{
    video_id: string;
    video_title: string;
    video_url: string;
    video_description?: string;
    video_priority?: number;
    /**
     * Muestra gratuita (PR #90 de SquatFit): `true`/`false` cuando el
     * backend ya lo manda, `undefined` si esta instancia todavía no
     * despliega ese campo — NO tratar `undefined` como `false`, son cosas
     * distintas («no se sabe» vs «no tiene»).
     */
    video_is_free_sample?: boolean;
  }>;
  videoPresentationUrl?: string;
  cursoId?: string;
  /** Muestra la sección «Duración y entrega» (15.9). Tolerante: por defecto se
   *  oculta salvo que el backend soporte los campos o el detalle ya los traiga. */
  showDelivery?: boolean;
}

export function CreateCursoForm({
  form,
  onSubmit,
  isLoading,
  onCancel,
  submitLabel = "Crear Curso",
  loadingLabel = "Creando...",
  currentVideos,
  videoPresentationUrl,
  cursoId,
  showDelivery,
}: CreateCursoFormProps) {
  const deliveryVisible = showDelivery ?? PRODUCT_DELIVERY_SUPPORTED;
  const deliveryValue: ProductDeliveryValue = {
    accessType: form.watch("access_type") ?? "permanent",
    accessMonths: form.watch("access_months"),
    dripMode: form.watch("drip_mode") ?? "none",
    dripIntervalDays: form.watch("drip_interval_days"),
    dripStartDelayDays: form.watch("drip_start_delay_days"),
  };
  const handleDeliveryChange = (v: ProductDeliveryValue) => {
    form.setValue("access_type", v.accessType);
    form.setValue("access_months", v.accessMonths);
    form.setValue("drip_mode", v.dripMode);
    form.setValue("drip_interval_days", v.dripIntervalDays);
    form.setValue("drip_start_delay_days", v.dripStartDelayDays);
  };
  const deleteVideoMutation = useDeleteCursoVideo();
  const updateVideoMetadataMutation = useUpdateCursoVideoMetadata();
  const freeSampleMutation = useToggleCursoVideoFreeSample();
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [videoToEdit, setVideoToEdit] = useState<{
    id: string;
    title: string;
    description: string;
    priority: number;
  } | null>(null);
  // Fila con el guardado del flag «muestra gratuita» en vuelo (deshabilita
  // el switch de esa fila mientras tanto, igual que el ranking de recetas).
  const [guardandoFreeSample, setGuardandoFreeSample] = useState<Set<string>>(new Set());

  const toggleFreeSample = (
    video: { video_id: string; video_title: string; video_description?: string; video_priority?: number },
    next: boolean,
  ) => {
    if (!cursoId) return;
    const verbo = next ? "marcar como muestra gratuita" : "quitar de muestra gratuita";
    if (!confirm(`¿Seguro que quieres ${verbo} la clase «${video.video_title}»?`)) return;
    setGuardandoFreeSample((s) => new Set(s).add(video.video_id));
    freeSampleMutation.mutate(
      {
        videoId: video.video_id,
        courseId: cursoId,
        nextValue: next,
        title: video.video_title,
        description: video.video_description ?? null,
        priority: video.video_priority ?? null,
      },
      {
        onSuccess: () => {
          toast.success(
            next
              ? `«${video.video_title}» ahora es muestra gratuita`
              : `«${video.video_title}» ya no es muestra gratuita`,
          );
        },
        onError: (e) => {
          toast.error(e instanceof Error ? e.message : "No se ha podido guardar el cambio");
        },
        onSettled: () => {
          setGuardandoFreeSample((s) => {
            const n = new Set(s);
            n.delete(video.video_id);
            return n;
          });
        },
      },
    );
  };

  const addVideo = form.watch("add_course_video");
  const videoType = form.watch("course_video_type");

  const [videoFile, setVideoFile] = useState<File | null>(null);

  const handleVideoFileChange = (file: File | null) => {
    if (file) {
      setVideoFile(file);
      form.setValue("course_video_file", file);
    } else {
      setVideoFile(null);
      form.setValue("course_video_file", undefined);
    }
  };

  const clearVideoFile = () => {
    setVideoFile(null);
    form.setValue("course_video_file", undefined);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Bloque: Información básica */}
        <div className="border-border/70 bg-background space-y-5 rounded-lg border p-4">
          <p className="text-muted-foreground text-sm font-medium">Información básica</p>
          {/* Nombre del Curso */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Curso *</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Fundamentos de Yoga" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Descripción */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe el contenido y objetivos del curso..."
                    className="min-h-[100px] resize-none"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormDescription>Mínimo 10 caracteres, máximo 500</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Bloque: Instructor y precio */}
        <div className="border-border/70 bg-background space-y-5 rounded-lg border p-4">
          <p className="text-muted-foreground text-sm font-medium">Instructor y precio</p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Instructor */}
            <FormField
              control={form.control}
              name="instructor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructor *</FormLabel>
                  <FormControl>
                    <InstructorSelect
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                      placeholder="Selecciona un instructor"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Precio */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio (€) *</FormLabel>
                  <FormControl>
                    <PriceInput valueType="number" placeholder="0.00" disabled={isLoading} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Bloque: Portada del curso */}
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <CoverImageUpload
                  value={{ file: form.watch("image_file") ?? null, url: field.value ?? "" }}
                  onChange={({ file, url }) => {
                    field.onChange(url);
                    form.setValue("image_file", file ?? undefined);
                  }}
                  initialPreviewUrl={field.value || null}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Bloque: Video de presentación */}
        <div className="border-border/70 bg-background space-y-5 rounded-lg border p-4">
          <p className="text-muted-foreground text-sm font-medium">Video de presentación</p>
          <FormField
            control={form.control}
            name="video_presentation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL del video de presentación</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://ejemplo.com/video.mp4"
                    {...field}
                    value={field.value ?? ""}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormDescription>Enlace al video de presentación</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Bloque: Duración y entrega (15.9) — tolerante: oculto si el backend no soporta los campos */}
        {deliveryVisible && (
          <ProductDeliveryFields value={deliveryValue} onChange={handleDeliveryChange} disabled={isLoading} />
        )}

        {/* Bloque: Primer video de instrucción (Opcional) */}
        <div className="border-border/70 bg-background space-y-5 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Video del curso</p>
              <p className="text-muted-foreground text-xs">Vincular o subir el primer video educativo del curso</p>
            </div>
            <FormField
              control={form.control}
              name="add_course_video"
              render={({ field }) => (
                <FormItem className="flex items-center space-y-0 space-x-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {addVideo && (
            <div className="space-y-4 border-t pt-3">
              {/* Selector de tipo (Local vs Externo) */}
              <div className="space-y-2">
                <FormLabel>Tipo de video</FormLabel>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={videoType === "external" ? "default" : "outline"}
                    size="sm"
                    onClick={() => form.setValue("course_video_type", "external")}
                    disabled={isLoading}
                    className="gap-1.5"
                  >
                    <Link2 className="h-4 w-4" />
                    Vincular Externo
                  </Button>
                  <Button
                    type="button"
                    variant={videoType === "local" ? "default" : "outline"}
                    size="sm"
                    onClick={() => form.setValue("course_video_type", "local")}
                    disabled={isLoading}
                    className="gap-1.5"
                  >
                    <Upload className="h-4 w-4" />
                    Subir Local
                  </Button>
                </div>
              </div>

              {videoType === "external" ? (
                // Video Externo
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="course_video_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título del video *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Introducción teórica" {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="course_video_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL del video externo *</FormLabel>
                        <FormControl>
                          <Input placeholder="https://www.youtube.com/watch?v=..." {...field} disabled={isLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                // Video Local
                <FormField
                  control={form.control}
                  name="course_video_file"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Archivo de video *</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Input
                              type="file"
                              accept="video/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                handleVideoFileChange(file);
                                onChange(file);
                              }}
                              disabled={isLoading}
                              className="cursor-pointer"
                              {...field}
                            />
                            {videoFile && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={clearVideoFile}
                                disabled={isLoading}
                              >
                                <X className="size-4" />
                              </Button>
                            )}
                          </div>
                          {videoFile && (
                            <div className="text-muted-foreground bg-muted/20 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                              <FileVideo className="text-primary h-4 w-4" />
                              <span className="text-foreground truncate font-medium">{videoFile.name}</span>
                              <span className="text-xs">({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Campos comunes (Descripción, Prioridad) */}
              <FormField
                control={form.control}
                name="course_video_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción del video (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Breve resumen del contenido del video..." {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="course_video_priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad / Orden (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ej: 1"
                        disabled={isLoading}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {/* Videos Cargados */}
        {((videoPresentationUrl && videoPresentationUrl.trim() !== "") ||
          (currentVideos && currentVideos.length > 0)) && (
          <div className="border-border/70 bg-background space-y-4 rounded-lg border p-4">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Videos cargados en este curso</p>
              <p className="text-muted-foreground text-xs">
                La clase marcada como <Gift className="inline size-3" /> «muestra gratuita» la ve cualquier cliente
                registrado sin haber comprado el curso.
              </p>
            </div>

            {/* Degradación: el backend de esta instancia todavía no manda
                `video_is_free_sample` (PR #90 de SquatFit, sin desplegar).
                Se puede MARCAR igual (el PUT ya lo acepta), pero no se puede
                confirmar el estado hasta que se despliegue la lectura. */}
            {currentVideos &&
              currentVideos.length > 0 &&
              !currentVideos.some((v) => typeof v.video_is_free_sample === "boolean") && (
                <Alert>
                  <CircleAlert className="size-4" />
                  <AlertTitle>Todavía no se puede confirmar qué clase es la muestra gratuita</AlertTitle>
                  <AlertDescription>
                    El backend de esta instancia no devuelve <code>video_is_free_sample</code> en el detalle del curso
                    (PR #90 de SquatFit, abierto y sin desplegar). Puedes marcar una clase con el interruptor de abajo —
                    el guardado ya funciona —, pero hasta que se despliegue el resto del PR no se verá reflejado aquí.
                  </AlertDescription>
                </Alert>
              )}

            {/* Aviso (no bloqueo) si hay más de una clase marcada: puede ser
                deliberado, pero que quien lo mire lo sepa. */}
            {currentVideos && currentVideos.filter((v) => v.video_is_free_sample === true).length > 1 && (
              <Alert>
                <CircleAlert className="size-4" />
                <AlertTitle>
                  {currentVideos.filter((v) => v.video_is_free_sample === true).length} clases marcadas como muestra
                  gratuita en este curso
                </AlertTitle>
                <AlertDescription>
                  No está prohibido — puede ser una decisión deliberada —, pero lo habitual es una sola clase de muestra
                  por curso. Confirma que dar acceso a varias es intencional.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3">
              {/* Video de presentación */}
              {videoPresentationUrl && videoPresentationUrl.trim() !== "" && (
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="bg-primary/10 shrink-0 rounded-md p-2">
                      <FileVideo className="text-primary h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-primary truncate text-xs font-semibold tracking-wide uppercase">
                        Video de Presentación
                      </p>
                      <p className="text-muted-foreground truncate text-xs">{videoPresentationUrl}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    Presentación
                  </Badge>
                </div>
              )}

              {/* Videos del currículo */}
              {currentVideos?.map((video) => (
                <div
                  key={video.video_id}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="bg-primary/10 shrink-0 rounded-md p-2">
                      <FileVideo className="text-primary h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{video.video_title}</p>
                      <p className="text-muted-foreground truncate text-xs">{video.video_url}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">Prioridad: {video.video_priority ?? 0}</Badge>
                    {cursoId && (
                      <div
                        className="flex items-center gap-1.5"
                        title={
                          video.video_is_free_sample === true
                            ? "Es la muestra gratuita de este curso"
                            : "Marcar como muestra gratuita"
                        }
                      >
                        {guardandoFreeSample.has(video.video_id) ? (
                          <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
                        ) : (
                          <Gift
                            className={`size-3.5 ${video.video_is_free_sample === true ? "text-[#FF690B]" : "text-muted-foreground"}`}
                          />
                        )}
                        <Switch
                          checked={video.video_is_free_sample === true}
                          disabled={guardandoFreeSample.has(video.video_id) || isLoading}
                          onCheckedChange={(next) => toggleFreeSample(video, next)}
                          aria-label={
                            video.video_is_free_sample === true
                              ? `Quitar «${video.video_title}» de muestra gratuita`
                              : `Marcar «${video.video_title}» como muestra gratuita`
                          }
                        />
                      </div>
                    )}
                    {cursoId && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8"
                          onClick={() =>
                            setVideoToEdit({
                              id: video.video_id,
                              title: video.video_title,
                              description: video.video_description ?? "",
                              priority: video.video_priority ?? 0,
                            })
                          }
                          disabled={isLoading || deleteVideoMutation.isPending || updateVideoMetadataMutation.isPending}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                          onClick={() => setVideoToDelete(video.video_id)}
                          disabled={isLoading || deleteVideoMutation.isPending || updateVideoMetadataMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex justify-end gap-3 pt-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? loadingLabel : submitLabel}
          </Button>
        </div>
      </form>

      {/* Alerta de eliminación */}
      <AlertDialog open={!!videoToDelete} onOpenChange={(open) => !open && setVideoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de eliminar este video?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El video se eliminará permanentemente de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (videoToDelete && cursoId) {
                  deleteVideoMutation.mutate({ videoId: videoToDelete, courseId: cursoId });
                }
              }}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de edición de video */}
      <Dialog open={!!videoToEdit} onOpenChange={(open) => !open && setVideoToEdit(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar metadatos del video</DialogTitle>
            <DialogDescription>
              Modifica la información del video. Haz clic en guardar cuando termines.
            </DialogDescription>
          </DialogHeader>
          {videoToEdit && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={videoToEdit.title}
                  onChange={(e) => setVideoToEdit({ ...videoToEdit, title: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={videoToEdit.description}
                  onChange={(e) => setVideoToEdit({ ...videoToEdit, description: e.target.value })}
                  className="resize-none"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Input
                  id="priority"
                  type="number"
                  value={videoToEdit.priority}
                  onChange={(e) => setVideoToEdit({ ...videoToEdit, priority: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVideoToEdit(null)}>
              Cancelar
            </Button>
            <Button
              disabled={updateVideoMetadataMutation.isPending || !videoToEdit?.title}
              onClick={async () => {
                if (videoToEdit && cursoId) {
                  await updateVideoMetadataMutation.mutateAsync({
                    videoId: videoToEdit.id,
                    courseId: cursoId,
                    data: {
                      title: videoToEdit.title,
                      description: videoToEdit.description,
                      priority: videoToEdit.priority,
                    },
                  });
                  setVideoToEdit(null);
                }
              }}
            >
              {updateVideoMetadataMutation.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
}
