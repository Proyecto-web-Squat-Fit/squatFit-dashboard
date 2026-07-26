import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { PedidosService, type GetPedidosParams, type PedidoStatus } from "@/lib/services/pedidos-service";

export const pedidosKeys = {
  all: ["pedidos"] as const,
  lists: () => [...pedidosKeys.all, "list"] as const,
  list: (params: GetPedidosParams) => [...pedidosKeys.lists(), params] as const,
};

export function usePedidos(params: GetPedidosParams = {}) {
  return useQuery({
    queryKey: pedidosKeys.list(params),
    queryFn: () => PedidosService.getPedidos(params),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useUpdatePedidoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PedidoStatus }) => PedidosService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.lists() });
      toast.success("Estado del pedido actualizado");
    },
    onError: (e: Error) => toast.error(e.message || "Error al cambiar el estado"),
  });
}

export function useUpdatePedidoPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paymentMethod }: { id: string; paymentMethod: string }) =>
      PedidosService.updatePaymentMethod(id, paymentMethod),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.lists() });
      toast.success("Método de pago actualizado");
    },
    onError: (e: Error) => toast.error(e.message || "Error al cambiar el método de pago"),
  });
}

export function useSendPedidoEmail() {
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status?: PedidoStatus }) => PedidosService.sendStatusEmail(id, status),
    onMutate: () => toast.loading("Enviando email...", { id: "pedido-email" }),
    onSuccess: (res) => toast.success(res.message ?? "Email enviado", { id: "pedido-email" }),
    onError: (e: Error) => toast.error(e.message || "Error al enviar el email", { id: "pedido-email" }),
  });
}

export function useRefundPedido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, amountCents }: { id: string; reason: string; amountCents?: number }) =>
      PedidosService.refund(id, reason, amountCents),
    onMutate: () => toast.loading("Procesando reembolso...", { id: "pedido-refund" }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: pedidosKeys.lists() });
      toast.success(res.message ?? "Reembolso procesado", { id: "pedido-refund" });
    },
    onError: (e: Error) => toast.error(e.message || "Error al procesar el reembolso", { id: "pedido-refund" }),
  });
}
