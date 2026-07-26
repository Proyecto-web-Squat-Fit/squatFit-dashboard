import type { Pedido, PedidoShippingAddress } from "@/lib/services/pedidos-service";

import { formatPedidoDate, PAYMENT_META, STATUS_META } from "./pedidos-shared";

/** Líneas de la dirección de envío del pedido, si la web la recogió. */
function shippingLines(a: PedidoShippingAddress | null): string[] {
  if (!a) return ["Dirección: — (pedido sin dirección de envío)"];
  const name = [a.firstName, a.lastName].filter(Boolean).join(" ");
  return [
    ...(name ? [`Destinatario: ${name}`] : []),
    `Dirección: ${[a.address, a.apartment].filter(Boolean).join(", ") || "—"}`,
    `Población: ${[a.postalCode, a.city].filter(Boolean).join(" ") || "—"}`,
    `País: ${a.country ?? "—"}`,
    ...(a.phone ? [`Teléfono: ${a.phone}`] : []),
    ...(a.dni_cif ? [`DNI/CIF: ${a.dni_cif}`] : []),
    ...(a.notes ? [`Notas: ${a.notes}`] : []),
  ];
}

// ============================================================================
// Descargas del módulo de Pedidos: factura PDF y ficha de envío.
// Se generan en el cliente (jspdf), sin necesidad de backend.
// ============================================================================

/** Factura sencilla en PDF con los datos y líneas del pedido. */
export async function downloadInvoice(pedido: Pedido) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.setTextColor(54, 60, 152); // índigo de marca
  doc.text("Squad Fit — Factura", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Pedido: ${pedido.shortId}`, 14, 30);
  doc.text(`Fecha: ${new Date(pedido.createdAt).toLocaleDateString("es-ES")}`, 14, 36);
  doc.text(`Cliente: ${pedido.customerName}`, 14, 42);
  doc.text(`Email: ${pedido.customerEmail}`, 14, 48);
  doc.text(
    `Método de pago: ${pedido.paymentMethod ? (PAYMENT_META[pedido.paymentMethod] ?? pedido.paymentMethod) : "—"}`,
    14,
    54,
  );

  autoTable(doc, {
    startY: 62,
    head: [["Producto", "Cantidad", "Precio unitario"]],
    body: pedido.items.map((i) => [
      i.product_name,
      String(i.quantity),
      `${pedido.currency}${parseFloat(i.unit_price).toFixed(2)}`,
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [54, 60, 152] },
  });

  const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80;
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text(`Total: ${pedido.currency}${pedido.total.toFixed(2)}`, 14, lastY + 12);

  doc.save(`factura-${pedido.shortId.replace("#", "")}.pdf`);
}

/** Ficha de envío en texto plano (datos del cliente + contenido del pedido). */
export function downloadShippingInfo(pedido: Pedido) {
  const lines = [
    `INFORMACIÓN DE ENVÍO — Pedido ${pedido.shortId}`,
    `Estado: ${STATUS_META[pedido.status].label}`,
    `Fecha: ${formatPedidoDate(pedido.createdAt)}`,
    "",
    `Cliente: ${pedido.customerName}`,
    `Email: ${pedido.customerEmail}`,
    "",
    ...shippingLines(pedido.shippingAddress),
    "",
    "Contenido:",
    ...pedido.items.map((i) => `  - ${i.product_name} ×${i.quantity}`),
    "",
    `Total: ${pedido.currency}${pedido.total.toFixed(2)}`,
    `Pago: ${pedido.paymentMethod ? (PAYMENT_META[pedido.paymentMethod] ?? pedido.paymentMethod) : "—"}`,
    `Origen: ${pedido.origin}`,
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `envio-${pedido.shortId.replace("#", "")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
