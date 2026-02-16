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

interface UserItem {
  id: string;
  email: string;
  nom?: string | null;
  prenom?: string | null;
  name?: string | null;
  active: boolean;
  mobileAccess?: boolean;
  lastLoginAt?: string | null;
  profil?: { libelle: string } | null;
}

interface UsersExportMenuProps {
  items: UserItem[];
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function UsersExportMenu({ items, containerRef }: UsersExportMenuProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const exportCSV = () => {
    setExporting("csv");
    const headers = ["Email", "Nom", "Prénom", "Profil", "Statut", "Mobile", "Dernière connexion"];
    const rows = items.map((u) => [
      u.email,
      u.nom ?? "",
      u.prenom ?? "",
      u.profil?.libelle ?? "",
      u.active ? "Actif" : "Suspendu",
      u.mobileAccess ? "Oui" : "Non",
      u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("fr-FR") : "",
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
  };

  const exportExcel = async () => {
    setExporting("excel");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Utilisateurs");
      ws.columns = [
        { header: "Email", key: "email", width: 30 },
        { header: "Nom", key: "nom", width: 15 },
        { header: "Prénom", key: "prenom", width: 15 },
        { header: "Profil", key: "profil", width: 15 },
        { header: "Statut", key: "statut", width: 10 },
        { header: "Mobile", key: "mobile", width: 8 },
        { header: "Dernière connexion", key: "lastLogin", width: 18 },
      ];
      items.forEach((u) => {
        ws.addRow({
          email: u.email,
          nom: u.nom ?? "",
          prenom: u.prenom ?? "",
          profil: u.profil?.libelle ?? "",
          statut: u.active ? "Actif" : "Suspendu",
          mobile: u.mobileAccess ? "Oui" : "Non",
          lastLogin: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("fr-FR") : "",
        });
      });
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `utilisateurs-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export Excel:", err);
    }
    setExporting(null);
  };

  const exportPDF = async () => {
    if (!containerRef?.current) return;
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
      const pdf = new jsPDF("l", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height) * 0.95;
      pdf.addImage(imgData, "PNG", 10, 10, canvas.width * ratio, canvas.height * ratio);
      pdf.save(`utilisateurs-${new Date().toISOString().slice(0, 10)}.pdf`);
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
        <DropdownMenuItem onClick={exportPDF} disabled={!containerRef?.current}>
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
