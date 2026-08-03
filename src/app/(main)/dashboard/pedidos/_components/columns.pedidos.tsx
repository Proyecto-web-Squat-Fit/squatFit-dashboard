"use client";

import Link from "next/link";

import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Eye, Loader2, Mail, Undo2, User } from "lucide-react";

import { CeldaEditable, type OpcionCelda } from "@/components/data-table/celda-editable";
import { CeldaTexto } from "@/components/data-table/celda-texto";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatearImporte, type MetaColumna } from "@/lib/formato-de-tablas";
import {
  MANUAL_PAYMENT_METHODS,
  ORDER_STATUSES,
  ORDER_STATUS_META,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHODS,
  itemsSummary,
  relativeDate,
  type Order,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/services/orders-service";

import { InvoiceBadge, PaymentBadge } from "./order-status-badge";

/**
 * COLUMNAS DE PEDIDOS — norma «formato de tablas» (30-jul-2026).
 *
 * La vista viva de /dashboard/pedidos era un `<table>` a mano con ocho cabeceras
 * fijas: no se podía redimensionar, ni ocultar, ni reordenar, ni cambiar nada
 * desde la fila. (Existía un `pedidos-table.tsx` con toda la infraestructura,
 * pero no lo renderizaba nadie: era código muerto, y al revisar la norma se miró
 * ese fichero y se dio Pedidos por bueno.)
 *
 * `obligatoriaPara` marca lo que un rol no puede ocultar; el criterio es el mismo
 * que en las otras seis tablas: la columna que IDENTIFICA la fila. Sin «Nombre y
 * email» ni «ID y fecha» la tabla es una lista de importes sin decir de qué
 * pedido ni de quién se habla. El admin no tiene obligatorias.
 */

export interface AccionesPedido {
  onVer: (order: Order) => void;
  onCompletar: (order: Order) => void;
  onEmail: (order: Order) => void;
  onReembolsar: (order: Order) => void;
  /** Cambia el estado desde la fila. Debe lanzar si el servidor lo rechaza. */
  onCambiarEstado: (order: Order, estado: OrderStatus) => Promise<unknown>;
  /** Marca el instrumento de pago (solo pagos manuales). Lanza si falla. */
  onCambiarPago: (order: Order, metodo: PaymentMethod) => Promise<unknown>;
  /** Filas con una mutación en vuelo: solo esa muestra spinner y se deshabilita. */
  completando: (id: string) => boolean;
  enviandoEmail: (id: string) => boolean;
}

const META_OBLIGATORIA: MetaColumna["obligatoriaPara"] = ["adviser", "support", "trainer", "nutritionist"];

/** Los seis estados, con su píldora de color. */
const OPCIONES_ESTADO: OpcionCelda[] = ORDER_STATUSES.map((s) => ({
  valor: s,
  etiqueta: ORDER_STATUS_META[s].label,
  clase: ORDER_STATUS_META[s].badge,
}));

/**
 * Los que se OFRECEN en el desplegable. «Devuelto» no está: marcarlo aquí
 * dejaría el pedido como reembolsado sin haber devuelto un euro, y el dinero
 * sale por el botón «Reembolsar», que llama al endpoint de reembolso y pide
 * motivo. Se sigue PINTANDO (ver `opcionesEstado`) porque un pedido devuelto
 * tiene que decir que lo está.
 */
const ESTADOS_ELEGIBLES: OrderStatus[] = ["pending", "processing", "shipped", "completed", "cancelled"];

function opcionesEstado(actual: OrderStatus): OpcionCelda[] {
  return OPCIONES_ESTADO.filter((o) => ESTADOS_ELEGIBLES.includes(o.valor as OrderStatus) || o.valor === actual);
}

/** Instrumentos de pago, con el mismo texto que la ficha del pedido. */
const OPCIONES_PAGO: OpcionCelda[] = PAYMENT_METHODS.map((m) => ({
  valor: m,
  etiqueta: PAYMENT_METHOD_LABEL[m],
}));

/**
 * El pago solo se toca cuando lo puso una persona (seQura/efectivo) o cuando no
 * hay ninguno. Si lo fijó Stripe —tarjeta, SEPA, Klarna, Link…— la píldora sale
 * de solo lectura: cambiarlo desde la fila no movería el cobro real, solo
 * estropearía la contabilidad de un pedido ya cobrado.
 *
 * La comparación es contra los MANUALES, no contra la lista de conocidos: un
 * instrumento que Stripe estrene mañana tiene que salir de solo lectura por
 * defecto, no volverse editable por no estar en ninguna lista nuestra.
 */
function pagoEditable(metodo: string | null): boolean {
  return metodo === null || (MANUAL_PAYMENT_METHODS as string[]).includes(metodo);
}

/**
 * Un pedido sin instrumento de pago puede serlo por dos motivos opuestos, y la
 * celda tiene que decir cuál (norma «"sin datos" no es lo mismo que cero»):
 *
 * - Nunca se cobró (pendiente, cancelado): **«Sin cobrar»**. No falta ningún
 *   dato; es que no hay pago que registrar y no hay nada que hacer.
 * - Cobrado, pero sin instrumento guardado: **«Sin marcar»**. Ahí sí falta un
 *   dato y alguien tiene que ponerlo (una venta manual por seQura o efectivo).
 *
 * Antes las dos decían «Sin marcar», así que la columna parecía llena de
 * deberes pendientes cuando la mitad eran carritos abandonados.
 */
function textoPagoVacio(estado: OrderStatus): string {
  return estado === "pending" || estado === "cancelled" ? "Sin cobrar" : "Sin marcar";
}

/** Iconos de acción por fila; el set depende del estado del pedido. */
function AccionesFila({ order, acciones }: { order: Order; acciones: AccionesPedido }) {
  const puedeCompletar = order.status === "pending" || order.status === "processing" || order.status === "shipped";
  // «Reembolsar» solo donde hay algo que devolver: en un pendiente no se ha
  // cobrado nada todavía.
  const puedeReembolsar = order.status === "completed" || order.status === "processing" || order.status === "shipped";
  const completando = acciones.completando(order.id);
  const enviando = acciones.enviandoEmail(order.id);

  return (
    <div className="flex items-center justify-end gap-0.5">
      <Button variant="ghost" size="icon" onClick={() => acciones.onVer(order)} title="Ver pedido">
        <Eye className="size-4" />
      </Button>
      {order.userId && (
        <Button asChild variant="ghost" size="icon" title="Ficha del cliente">
          <Link href={`/dashboard/alumnos/${order.userId}`}>
            <User className="size-4" />
          </Link>
        </Button>
      )}
      {puedeCompletar && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => acciones.onCompletar(order)}
          disabled={completando}
          title="Marcar como completado"
        >
          {completando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4 text-green-600" />
          )}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => acciones.onEmail(order)}
        disabled={enviando}
        title="Enviar email de estado"
      >
        {enviando ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
      </Button>
      {puedeReembolsar && (
        <Button
          variant="ghost"
          size="icon"
          className="text-rose-600"
          onClick={() => acciones.onReembolsar(order)}
          title="Reembolsar"
        >
          <Undo2 className="size-4" />
        </Button>
      )}
    </div>
  );
}

export function construirColumnasPedidos(acciones: AccionesPedido): ColumnDef<Order>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Seleccionar todo"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 36,
    },
    {
      id: "cliente",
      accessorFn: (o) => `${o.customerName} ${o.customerEmail}`,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
      meta: { label: "Nombre y email", obligatoriaPara: META_OBLIGATORIA } satisfies MetaColumna,
      size: 220,
      cell: ({ row }) => {
        const { customerName, customerEmail } = row.original;
        // Cuando el backend no encuentra ningún nombre devuelve el email (misma
        // cadena que la factura). Repetirlo en las dos líneas no aporta nada:
        // se enseña una sola vez.
        const soloEmail = !customerName || customerName === customerEmail;
        return (
          <div className="flex min-w-0 flex-col">
            {!soloEmail && <CeldaTexto className="font-medium">{customerName}</CeldaTexto>}
            <CeldaTexto apagado className={soloEmail ? undefined : "text-xs"}>
              {customerEmail}
            </CeldaTexto>
          </div>
        );
      },
    },
    {
      id: "pedido",
      accessorFn: (o) => o.createdAt,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Pedido" />,
      meta: { label: "ID y fecha", obligatoriaPara: META_OBLIGATORIA } satisfies MetaColumna,
      size: 160,
      cell: ({ row }) => (
        <div className="flex min-w-0 flex-col">
          {/* Clic en el ID = abrir el pedido completo. */}
          <button
            type="button"
            className="truncate text-left text-[#FF690B] hover:underline"
            onClick={() => acciones.onVer(row.original)}
            title="Ver pedido"
          >
            #{row.original.id.slice(0, 8)}
          </button>
          <span className="text-muted-foreground truncate text-xs">{relativeDate(row.original.createdAt)}</span>
        </div>
      ),
    },
    {
      id: "productos",
      accessorFn: (o) => itemsSummary(o.items),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Productos" />,
      meta: { label: "Productos" } satisfies MetaColumna,
      size: 220,
      cell: ({ row }) => (
        <CeldaTexto apagado className="text-sm">
          {itemsSummary(row.original.items)}
        </CeldaTexto>
      ),
    },
    {
      id: "origen",
      accessorFn: (o) => o.origin ?? "",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Origen" />,
      meta: { label: "Origen" } satisfies MetaColumna,
      size: 150,
      cell: ({ row }) => (
        <CeldaTexto apagado className="text-xs">
          {row.original.origin}
        </CeldaTexto>
      ),
    },
    {
      accessorKey: "paymentMethod",
      id: "pago",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Pago" />,
      meta: { label: "Pago" } satisfies MetaColumna,
      size: 130,
      cell: ({ row }) => {
        const metodo = row.original.paymentMethod;
        if (!pagoEditable(metodo)) return <PaymentBadge method={metodo} />;
        return (
          <CeldaEditable
            valor={metodo}
            opciones={OPCIONES_PAGO}
            vacio={textoPagoVacio(row.original.status)}
            // No hay «ningún método» en el backend: el DTO exige uno de los cinco.
            permiteVaciar={false}
            onGuardar={(v) => acciones.onCambiarPago(row.original, v as PaymentMethod)}
          />
        );
      },
    },
    {
      accessorKey: "status",
      id: "estado",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      meta: { label: "Estado" } satisfies MetaColumna,
      size: 150,
      cell: ({ row }) => (
        <CeldaEditable
          valor={row.original.status}
          opciones={opcionesEstado(row.original.status)}
          permiteVaciar={false}
          onGuardar={(v) => acciones.onCambiarEstado(row.original, v as OrderStatus)}
        />
      ),
    },
    {
      accessorKey: "total",
      id: "total",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      meta: { label: "Total" } satisfies MetaColumna,
      size: 110,
      cell: ({ row }) => {
        // Devuelto y cancelado van tachados: el importe existió pero ya no cuenta.
        const tachado = ORDER_STATUS_META[row.original.status].struck;
        return (
          <span className={`tabular-nums ${tachado ? "text-muted-foreground line-through" : ""}`}>
            {formatearImporte(row.original.total, row.original.currency)}
          </span>
        );
      },
    },
    {
      id: "factura",
      accessorFn: (o) => (o.hasInvoice === true ? (o.invoiceNumber ?? "sí") : o.hasInvoice === false ? "no" : ""),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Factura" />,
      meta: { label: "Factura" } satisfies MetaColumna,
      size: 150,
      cell: ({ row }) => (
        <InvoiceBadge hasInvoice={row.original.hasInvoice} invoiceNumber={row.original.invoiceNumber} />
      ),
    },
    {
      id: "acciones",
      header: () => <span className="sr-only">Acciones</span>,
      enableSorting: false,
      enableHiding: false,
      size: 180,
      cell: ({ row }) => <AccionesFila order={row.original} acciones={acciones} />,
    },
  ];
}
