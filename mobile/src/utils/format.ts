const nfXOF = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const nfEUR = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatMontant(n: number, devise = 'XOF'): string {
  const fmt = devise === 'EUR' ? nfEUR : nfXOF;
  return `${fmt.format(n)} ${devise === 'XOF' ? 'FCFA' : devise}`;
}

export function formatMontantSplit(n: number, devise = 'XOF'): { value: string; suffix: string } {
  const fmt = devise === 'EUR' ? nfEUR : nfXOF;
  return { value: fmt.format(n), suffix: devise === 'XOF' ? 'FCFA' : devise };
}

export function formatShort(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}Md`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function formatTimeAgo(d: string): string {
  const date = new Date(d);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "A l'instant";
  if (diffH < 24) return `Il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `Il y a ${diffD}j`;
  const diffM = Math.floor(diffD / 30);
  return `Il y a ${diffM} mois`;
}

export function formatDate(d: string | Date, style: 'short' | 'long' = 'short'): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (style === 'long') {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
