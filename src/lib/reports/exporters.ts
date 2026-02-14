import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import type { ReportRow } from "./runner";

export type ExportFormat = "pdf" | "excel" | "csv" | "json";

export async function exportToExcel(
  data: ReportRow[],
  title: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Rapport", {
    headerFooter: { firstHeader: title, firstFooter: `Généré le ${new Date().toLocaleString("fr-FR")}` },
  });
  if (data.length === 0) {
    sheet.addRow(["Aucune donnée"]);
  } else {
    const headers = Object.keys(data[0]!);
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    for (const row of data) {
      sheet.addRow(headers.map((h) => row[h]));
    }
    sheet.columns.forEach((col, i) => {
      col.width = Math.max(12, headers[i]?.length ?? 10);
    });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function exportToCsv(data: ReportRow[]): string {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]!);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(","),
    ...data.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];
  return "\uFEFF" + lines.join("\n");
}

export function exportToJson(data: ReportRow[]): string {
  return JSON.stringify(data, null, 2);
}

export function exportToPdf(data: ReportRow[], title: string): Buffer {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  let y = 15;
  pdf.setFontSize(14);
  pdf.text(title, 14, y);
  y += 10;
  pdf.setFontSize(10);
  pdf.text(`Généré le ${new Date().toLocaleString("fr-FR")}`, 14, y);
  y += 10;

  if (data.length === 0) {
    pdf.text("Aucune donnée", 14, y);
    return Buffer.from(pdf.output("arraybuffer"));
  }

  const headers = Object.keys(data[0]!);
  const colW = (pageW - 28) / headers.length;
  const rowH = 7;
  const maxRows = Math.floor((pageH - y - 20) / rowH);

  pdf.setFillColor(240, 240, 240);
  pdf.rect(14, y, pageW - 28, rowH, "F");
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(14, y, pageW - 28, rowH, "S");
  headers.forEach((h, i) => {
    pdf.text(String(h).slice(0, 15), 14 + i * colW + 2, y + 5);
  });
  y += rowH;

  let rowCount = 0;
  for (const row of data) {
    if (rowCount >= maxRows) {
      pdf.addPage("landscape");
      y = 15;
      rowCount = 0;
    }
    headers.forEach((h, i) => {
      const val = row[h];
      const text = val != null ? String(val).slice(0, 20) : "";
      pdf.text(text, 14 + i * colW + 2, y + 5);
    });
    pdf.rect(14, y, pageW - 28, rowH, "S");
    y += rowH;
    rowCount++;
  }

  return Buffer.from(pdf.output("arraybuffer"));
}
