import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  OrdersService,
  type Order,
  type OrdersQuery,
  type OrderStatus,
  type PaymentMethod,
  type RegisterShipmentPayload,
  type UpdateShipmentPayload,
} from "@/lib/services/orders-service";

const ORDERS_KEY = ["orders"] as const;
const SHIPMENT_KEY = ["order-shipment"] as const;
const INVOICE_KEY = ["order-invoice"] as const;

export function useOrders(query?: OrdersQuery) {
  return useQuery({
    queryKey: [...ORDERS_KEY, query ?? {}],
    queryFn: () => OrdersService.list(query),
    staleTime: 15_000,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => OrdersService.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORDERS_KEY }),
  });
}

export function useUpdateOrderPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, method }: { id: string; method: PaymentMethod }) => OrdersService.updatePayment(id, method),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORDERS_KEY }),
  });
}

export function useSendOrderEmail() {
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status?: OrderStatus }) => OrdersService.sendEmail(id, status),
  });
}

// ─── Factura del pedido ──────────────────────────────────────────────────────

/** Factura ya emitida del pedido (`null` si no tiene). Solo consulta, no emite. */
export function useOrderInvoice(orderId: string | null | undefined) {
  return useQuery({
    queryKey: [...INVOICE_KEY, orderId],
    queryFn: () => OrdersService.getInvoice(orderId!),
    enabled: Boolean(orderId),
    staleTime: 60_000,
  });
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, regenerate }: { orderId: string; regenerate?: boolean }) =>
      OrdersService.generateInvoice(orderId, { regenerate }),
    // El 400 (estado no facturable) y el 409 (derecho al olvido) son errores
    // de REGLA DE NEGOCIO, no fallos de red transitorios: si sale hoy,
    // reintentar en 1s (el `retry: 1` por defecto de mutations en
    // `query-provider.tsx`) va a dar el MISMO 400/409 sin haber cambiado
    // nada, y solo consigue que el staff vea el aviso un segundo más tarde.
    retry: false,
    onSuccess: (_data, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: [...INVOICE_KEY, orderId] });
      // La factura recién emitida cambia `has_invoice`/`invoice_number` de la
      // fila en el listado (columna + filtro de Factura): sin esto quedaría
      // desactualizada hasta el siguiente refetch por `staleTime`.
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY });
    },
  });
}

// ─── Envío del pedido (registro manual mientras Correos no activa la API) ────

export function useOrderShipment(orderId: string | null | undefined) {
  return useQuery({
    queryKey: [...SHIPMENT_KEY, orderId],
    queryFn: () => OrdersService.getShipment(orderId!),
    enabled: Boolean(orderId),
    staleTime: 15_000,
  });
}

/** Invalida a la vez el envío del pedido y la lista (el estado cambia). */
function useShipmentMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>, orderIdOf: (args: TArgs) => string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: [...SHIPMENT_KEY, orderIdOf(args)] });
      queryClient.invalidateQueries({ queryKey: ORDERS_KEY });
    },
  });
}

export function useRegisterShipment() {
  return useShipmentMutation(
    (payload: RegisterShipmentPayload) => OrdersService.registerShipment(payload),
    (p) => p.orderId,
  );
}

export function useUpdateShipment() {
  return useShipmentMutation(
    (payload: UpdateShipmentPayload) => OrdersService.updateShipment(payload),
    (p) => p.orderId,
  );
}

export function useMarkShipmentDelivered() {
  return useShipmentMutation(
    ({ orderId }: { orderId: string }) => OrdersService.markShipmentDelivered(orderId),
    (p) => p.orderId,
  );
}

export function useResendShipmentNotice() {
  return useShipmentMutation(
    ({ orderId }: { orderId: string }) => OrdersService.resendShipmentNotice(orderId),
    (p) => p.orderId,
  );
}

export type { Order };
