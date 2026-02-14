"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, FileSpreadsheet, FileText, Mail } from "lucide-react";

interface MarcheItem {
  id: string;
  code: string;
  libelle: string;
  montant: number;
  montantTotalXOF?: number;
  montantEncaisse?: number;
  montantDecaisse?: number;
  tresorerie?: number;
  ratioTreso?: number;
  ratioEncaisse?: number;
  deviseCode?: string;
  statut: string;
  dateDebut?: string | null;
  dateFin?: string | null;
  updatedAt: string;
  _count?: { accomptes: number; decaissements: number };
}

interface MarchesExportMenuProps {
  items: MarcheItem[];
  selectedIds: string[];
  dashboardRef?: React.RefObject<HTMLDivElement | null>;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export function MarchesExportMenu({
  items,
  selectedIds,
  dashboardRef,
  containerRef,
  className,
}: MarchesExportMenuProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const toExport = selectedIds.length > 0
    ? items.filter((m) => selectedIds.includes(m.id))
    : items;

  const exportCSV = () => {
    setExporting("csv");
    const headers = ["Code", "Libellé", "Montant", "Devise", "Trésorerie", "Statut", "Date fin"];
    const rows = toExport.map((m) => [
      m.code,
      m.libelle,
      m.montant.toLocaleString("fr-FR"),
      m.deviseCode ?? "XOF",
      (m.tresorerie ?? 0).toLocaleString("fr-FR"),
      m.statut,
      m.dateFin ? new Date(m.dateFin).toLocaleDateString("fr-FR") : "",
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `marches-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
  };

  const exportExcel = async () => {
    setExporting("excel");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Marchés");
      ws.columns = [
        { header: "Code", key: "code", width: 15 },
        { header: "Libellé", key: "libelle", width: 30 },
        { header: "Montant", key: "montant", width: 15 },
        { header: "Devise", key: "devise", width: 8 },
        { header: "Trésorerie", key: "tresorerie", width: 15 },
        { header: "Statut", key: "statut", width: 10 },
        { header: "Date fin", key: "dateFin", width: 12 },
      ];
      toExport.forEach((m) => {
        ws.addRow({
          code: m.code,
          libelle: m.libelle,
          montant: m.montant,
          devise: m.deviseCode ?? "XOF",
          tresorerie: m.tresorerie ?? 0,
          statut: m.statut,
          dateFin: m.dateFin ? new Date(m.dateFin).toLocaleDateString("fr-FR") : "",
        });
      });
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `marches-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export Excel:", err);
    }
    setExporting(null);
  };

  const exportPDF = async () => {
    const ref = containerRef ?? dashboardRef;
    if (!ref?.current) return;
    setExporting("pdf");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height) * 0.95;
      pdf.addImage(imgData, "PNG", 10, 10, canvas.width * ratio, canvas.height * ratio);
      pdf.save(`marches-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("Export PDF:", err);
    }
    setExporting(null);
  };

  const exportEmail = () => {
    const subject = encodeURIComponent(`Export Marchés - ${new Date().toLocaleDateString("fr-FR")}`);
    const body = encodeURIComponent(
      `Bonjour,\n\nVeuillez trouver ci-joint l'export des marchés (${toExport.length} éléments).\n\nCordialement`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const refToUse = containerRef ?? dashboardRef;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!!exporting} className={className}>
          <FileDown className="h-4 w-4 mr-2" />
          Export {exporting ? "..." : "▼"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportPDF} disabled={!refToUse?.current}>
          <FileText className="h-4 w-4 mr-2" />
          PDF (avec graphiques)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCSV}>
          <FileText className="h-4 w-4 mr-2" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportEmail}>
          <Mail className="h-4 w-4 mr-2" />
          Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
