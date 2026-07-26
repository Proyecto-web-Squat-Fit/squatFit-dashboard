// Utilidades de exportación de datos de tabla a CSV / XLSX / PDF.
// Reutilizable: pásale las columnas (clave + etiqueta) y las filas.

export interface ExportColumn<T> {
  key: keyof T | string;
  label: string;
  /** valor a exportar (por defecto row[key]) */
  value?: (row: T) => string | number;
}

function cellValue<T>(row: T, col: ExportColumn<T>): string {
  const raw = col.value ? col.value(row) : (row as Record<string, unknown>)[col.key as string];
  return String(raw ?? "");
}

export function exportCSV<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = columns.map((c) => esc(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => esc(cellValue(r, c))).join(",")).join("\n");
  const csv = `\uFEFF${header}\n${body}`; // BOM para acentos en Excel
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

export async function exportXLSX<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  const XLSX = await import("xlsx");
  const aoa = [columns.map((c) => c.label), ...rows.map((r) => columns.map((c) => cellValue(r, c)))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function exportPDF<T>(filename: string, columns: ExportColumn<T>[], rows: T[], title?: string) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  if (title) {
    doc.setFontSize(14);
    doc.text(title, 14, 16);
  }
  autoTable(doc, {
    head: [columns.map((c) => c.label)],
    body: rows.map((r) => columns.map((c) => cellValue(r, c))),
    startY: title ? 22 : 14,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [54, 60, 152] }, // índigo de marca
  });
  doc.save(`${filename}.pdf`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
