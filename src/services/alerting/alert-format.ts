/**
 * Formatage des contenus d'alertes (email, SMS, push, webhook).
 * Séparateurs de milliers et devise pour tous les montants.
 */

const SYMBOLES_DEVISE: Record<string, string> = {
  XOF: "FCFA",
  EUR: "€",
  USD: "$",
  GNF: "FG",
};

export function formatMontant(montant: number, deviseCode = "XOF"): string {
  const symbole = SYMBOLES_DEVISE[deviseCode] ?? deviseCode;
  const fmt = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: deviseCode === "XOF" ? 0 : 2,
    useGrouping: true,
  }).format(montant);
  return `${fmt} ${symbole}`;
}

export function formatDateFr(date: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export interface AlertFormatContext {
  alerteCode: string;
  libelle: string;
  message?: string;
  marcheCode?: string;
  libelleMarche?: string;
  montant?: number;
  seuil?: number;
  solde?: number;
  deviseCode?: string;
  dateFin?: string;
}

export function buildAlertBodyPlain(context: AlertFormatContext): string {
  const devise = context.deviseCode ?? "XOF";
  const lines: string[] = [];

  lines.push(context.message ?? context.libelle);

  if (context.marcheCode) {
    lines.push(`Marché : ${context.libelleMarche ? `${context.libelleMarche} (${context.marcheCode})` : context.marcheCode}`);
  }

  if (context.montant != null) {
    lines.push(`Montant : ${formatMontant(context.montant, devise)}`);
  }

  if (context.solde != null) {
    lines.push(`Solde actuel : ${formatMontant(context.solde, devise)}`);
  }

  if (context.seuil != null) {
    lines.push(`Seuil : ${formatMontant(context.seuil, devise)}`);
  }

  if (context.dateFin) {
    lines.push(`Échéance : ${formatDateFr(context.dateFin)}`);
  }

  return lines.join("\n");
}

export function buildAlertBodyHtml(context: AlertFormatContext): string {
  const devise = context.deviseCode ?? "XOF";
  const tableRows: string[] = [];

  if (context.marcheCode) {
    const marcheLabel = context.libelleMarche ? `${escapeHtml(context.libelleMarche)} <span style="color:#666;">(${escapeHtml(context.marcheCode)})</span>` : escapeHtml(context.marcheCode);
    tableRows.push(`
      <tr>
        <td style="padding:8px 12px;background:#f8fafc;font-weight:600;width:140px;">Marché</td>
        <td style="padding:8px 12px;">${marcheLabel}</td>
      </tr>`);
  }

  if (context.montant != null) {
    tableRows.push(`
      <tr>
        <td style="padding:8px 12px;background:#f8fafc;font-weight:600;">Montant</td>
        <td style="padding:8px 12px;font-weight:600;color:#0f766e;">${formatMontant(context.montant, devise)}</td>
      </tr>`);
  }

  if (context.solde != null) {
    tableRows.push(`
      <tr>
        <td style="padding:8px 12px;background:#f8fafc;font-weight:600;">Solde actuel</td>
        <td style="padding:8px 12px;">${formatMontant(context.solde, devise)}</td>
      </tr>`);
  }

  if (context.seuil != null) {
    tableRows.push(`
      <tr>
        <td style="padding:8px 12px;background:#f8fafc;font-weight:600;">Seuil</td>
        <td style="padding:8px 12px;">${formatMontant(context.seuil, devise)}</td>
      </tr>`);
  }

  if (context.dateFin) {
    tableRows.push(`
      <tr>
        <td style="padding:8px 12px;background:#f8fafc;font-weight:600;">Échéance</td>
        <td style="padding:8px 12px;">${formatDateFr(context.dateFin)}</td>
      </tr>`);
  }

  const intro = context.message ?? context.libelle;
  const tableBlock = tableRows.length > 0
    ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">${tableRows.join("")}</table>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f1f5f9;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#0f766e;color:#fff;padding:20px 24px;">
      <h1 style="margin:0;font-size:18px;font-weight:600;">Emeraude Business</h1>
      <p style="margin:8px 0 0 0;font-size:14px;opacity:0.9;">${escapeHtml(context.libelle)}</p>
    </div>
    <div style="padding:24px;">
      ${intro ? `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.5;color:#333;">${escapeHtml(intro)}</p>` : ""}
      ${tableBlock}
      <p style="margin:20px 0 0 0;font-size:12px;color:#64748b;">
        Cet email a été envoyé automatiquement par Emeraude Business. Merci de ne pas y répondre.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
