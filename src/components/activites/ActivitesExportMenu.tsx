"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

interface ActiviteItem {
  id: string;
  code: string;
  libelle: string;
  type: string;
  statut: string;
  deviseCode: string;
  totalEntrees: number;
  totalSorties: number;
  solde: number;
  soldeXOF: number;
  budgetPrevisionnel?: number | null;
  createdAt: string;
  updatedAt: string;
}

interface ActivitesExportMenuProps {
  items: ActiviteItem[];
  selectedIds: string[];
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function ActivitesExportMenu({
  items,
  selectedIds,
  containerRef,
}: ActivitesExportMenuProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const toExport = selectedIds.length > 0
    ? items.filter((a) => selectedIds.includes(a.id))
    : items;

  const exportCSV = () => {
    setExporting("csv");
    const headers = ["Code", "Libellé", "Type", "Statut", "Devise", "Entrées", "Sorties", "Solde"];
    const rows = toExport.map((a) => [
      a.code,
      a.libelle,
      a.type,
      a.statut,
      a.deviseCode,
      a.totalEntrees.toLocaleString("fr-FR"),
      a.totalSorties.toLocaleString("fr-FR"),
      a.solde.toLocaleString("fr-FR"),
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activites-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
  };

  const exportExcel = async () => {
    setExporting("excel");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Activités");
      ws.columns = [
        { header: "Code", key: "code", width: 15 },
        { header: "Libellé", key: "libelle", width: 30 },
        { header: "Type", key: "type", width: 15 },
        { header: "Statut", key: "statut", width: 12 },
        { header: "Devise", key: "devise", width: 8 },
        { header: "Entrées", key: "entrees", width: 15 },
        { header: "Sorties", key: "sorties", width: 15 },
        { header: "Solde", key: "solde", width: 15 },
      ];
      toExport.forEach((a) => {
        ws.addRow({
          code: a.code,
          libelle: a.libelle,
          type: a.type,
          statut: a.statut,
          devise: a.deviseCode,
          entrees: a.totalEntrees,
          sorties: a.totalSorties,
          solde: a.solde,
        });
      });
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `activites-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export Excel:", err);
    }
    setExporting(null);
  };

  const exportPDF = async () => {
    if (!containerRef?.current) {
      toast.error("Le conteneur n'est pas disponible pour l'export PDF");
      return;
    }
    setExporting("pdf");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(containerRef.current, {
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
      pdf.save(`activites-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("Export PDF:", err);
    }
    setExporting(null);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!!exporting}>
          <FileDown className="h-4 w-4 mr-2" />
          Export {exporting ? "..." : ""}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={exportPDF}>
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCSV}>
          <FileText className="h-4 w-4 mr-2" />
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
