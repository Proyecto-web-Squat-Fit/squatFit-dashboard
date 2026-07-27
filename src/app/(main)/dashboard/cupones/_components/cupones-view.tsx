"use client";

import { useCallback, useEffect, useState } from "react";

import { Plus, Power, TicketPercent, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COUPONS_API_READY, CuponesService, type Cupon } from "@/lib/services/cupones-service";

/**
 * CUPONES (reestructura 27-jul): página nueva del grupo CRM para editar
 * cupones manualmente. El backend aún no expone endpoints de cupones, así que
 * la estructura está lista tras el flag COUPONS_API_READY (banco demo en
 * memoria + aviso, mismo patrón que recetas).
 */
export function CuponesView() {
  const [cupones, setCupones] = useState<Cupon[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    codigo: "",
    tipo: "porcentaje" as Cupon["tipo"],
    valor: 10,
    ambito: "Todo el catálogo",
    caduca: "",
  });

  const load = useCallback(async () => {
    setCupones(await CuponesService.getCupones());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const crear = async () => {
    if (!form.codigo.trim()) {
      toast.error("El cupón necesita un código");
      return;
    }
    await CuponesService.createCupon({
      codigo: form.codigo.trim().toUpperCase(),
      tipo: form.tipo,
      valor: form.valor,
      ambito: form.ambito,
      activo: true,
      caduca: form.caduca || null,
    });
    toast.success(`Cupón ${form.codigo.trim().toUpperCase()} creado`);
    setDialogOpen(false);
    setForm({ codigo: "", tipo: "porcentaje", valor: 10, ambito: "Todo el catálogo", caduca: "" });
    void load();
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Cupones</h1>
          <p className="text-muted-foreground text-sm">
            Códigos de descuento para el checkout: porcentaje o importe fijo, con ámbito y caducidad.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Nuevo cupón
        </Button>
      </div>

      {!COUPONS_API_READY && (
        <Alert>
          <TriangleAlert className="size-4" />
          <AlertTitle>Modo demostración</AlertTitle>
          <AlertDescription>
            El backend aún no expone endpoints de cupones. Lo que crees o borres aquí se ve en pantalla pero NO
            persiste. La página quedará operativa cuando el backend publique admin-panel/coupons/* (o el proxy a
            Stripe).
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descuento</TableHead>
              <TableHead>Ámbito</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Caducidad</TableHead>
              <TableHead className="text-right">Canjes</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cupones === null && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            )}
            {cupones?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                  No hay cupones todavía.
                </TableCell>
              </TableRow>
            )}
            {cupones?.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-semibold">
                  <span className="flex items-center gap-2">
                    <TicketPercent className="size-4 text-[#FF690B]" />
                    {c.codigo}
                  </span>
                </TableCell>
                <TableCell>{c.tipo === "porcentaje" ? `${c.valor} %` : `${c.valor} €`}</TableCell>
                <TableCell>{c.ambito}</TableCell>
                <TableCell>
                  <Badge variant={c.activo ? "default" : "secondary"}>{c.activo ? "Activo" : "Pausado"}</Badge>
                </TableCell>
                <TableCell>{c.caduca ?? "Sin caducidad"}</TableCell>
                <TableCell className="text-right">{c.canjes}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={c.activo ? "Pausar" : "Activar"}
                    onClick={async () => {
                      await CuponesService.toggleCupon(c.id);
                      void load();
                    }}
                  >
                    <Power className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Borrar"
                    onClick={async () => {
                      await CuponesService.deleteCupon(c.id);
                      toast.success(`Cupón ${c.codigo} borrado`);
                      void load();
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo cupón</DialogTitle>
            <DialogDescription>Código de descuento para el checkout.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                placeholder="SQUAD10"
                value={form.codigo}
                onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as Cupon["tipo"] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                    <SelectItem value="importe">Importe fijo (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="valor">Valor</Label>
                <Input
                  id="valor"
                  type="number"
                  min={0}
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ambito">Ámbito</Label>
              <Input
                id="ambito"
                placeholder="Todo el catálogo"
                value={form.ambito}
                onChange={(e) => setForm((f) => ({ ...f, ambito: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="caduca">Caducidad (opcional)</Label>
              <Input
                id="caduca"
                type="date"
                value={form.caduca}
                onChange={(e) => setForm((f) => ({ ...f, caduca: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={crear}>Crear cupón</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
