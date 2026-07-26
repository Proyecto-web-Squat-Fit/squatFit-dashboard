import { Metadata } from "next";

import { OrdersView } from "./_components/orders-view";

export const metadata: Metadata = {
  title: "Pedidos | Squad Fit",
  description: "Gestión de pedidos: estados, método de pago, origen y reembolsos",
};

export default function PedidosPage() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <OrdersView />
    </div>
  );
}
