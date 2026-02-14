"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MontantDisplay } from "@/components/devises/MontantDisplay";
import { CheckCircle2, Briefcase, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface KPICardsProps {
  kpis: {
    marchesActifs: number;
    marchesActifsDelta?: number;
    totalEncaissements: number;
    encEvolution?: number;
    totalDecaissements: number;
    decEvolution?: number;
    tresorerie: number;
    alertesActives?: number;
    conversionRates?: { EUR: number; USD: number };
  };
}

export function KPICards({ kpis }: KPICardsProps) {
  const tresorerieSaine = kpis.tresorerie >= 0;
  const tauxEUR = kpis.conversionRates?.EUR ?? 655.957;
  const tauxUSD = kpis.conversionRates?.USD ?? 600;

  const toEUR = (xof: number) => (xof / tauxEUR).toFixed(0);
  const toUSD = (xof: number) => (xof / tauxUSD).toFixed(0);

  const cards = [
    {
      id: "marches",
      icon: Briefcase,
      title: "Marchés",
      value: kpis.marchesActifs ?? 0,
      sub: kpis.marchesActifsDelta != null && kpis.marchesActifsDelta !== 0
        ? `${kpis.marchesActifsDelta > 0 ? "+" : ""}${kpis.marchesActifsDelta} ce mois`
        : "+2 ce mois",
      subColor: kpis.marchesActifsDelta != null && kpis.marchesActifsDelta !== 0
        ? (kpis.marchesActifsDelta > 0 ? "text-green-600" : "text-red-600")
        : "text-muted-foreground",
      equiv: null,
      href: "/marches?statut=actif",
      valueFormat: (v: number) => `${v} Actifs`,
    },
    {
      id: "encaissement",
      icon: ArrowDownCircle,
      title: "Encaissé",
      value: kpis.totalEncaissements ?? 0,
      sub: kpis.encEvolution != null && kpis.encEvolution !== 0
        ? `${kpis.encEvolution > 0 ? "+" : ""}${kpis.encEvolution.toFixed(1)}% ↗`
        : "Par rapport au mois précédent",
      subColor: kpis.encEvolution != null && kpis.encEvolution !== 0
        ? (kpis.encEvolution > 0 ? "text-green-600" : "text-red-600")
        : "text-muted-foreground",
      equiv: (kpis.totalEncaissements ?? 0) > 0 ? `≈ ${toEUR(kpis.totalEncaissements)} € / ${toUSD(kpis.totalEncaissements)} $` : null,
      href: "/marches",
      valueFormat: null,
    },
    {
      id: "decaissement",
      icon: ArrowUpCircle,
      title: "Décaissé",
      value: kpis.totalDecaissements ?? 0,
      sub: kpis.decEvolution != null && kpis.decEvolution !== 0
        ? `${kpis.decEvolution > 0 ? "+" : ""}${kpis.decEvolution.toFixed(1)}% ↗`
        : "Par rapport au mois précédent",
      subColor: kpis.decEvolution != null && kpis.decEvolution !== 0
        ? (kpis.decEvolution > 0 ? "text-red-600" : "text-green-600")
        : "text-muted-foreground",
      equiv: (kpis.totalDecaissements ?? 0) > 0 ? `≈ ${toEUR(kpis.totalDecaissements)} € / ${toUSD(kpis.totalDecaissements)} $` : null,
      href: "/marches",
      valueFormat: null,
    },
    {
      id: "tresorerie",
      icon: Wallet,
      title: "Trésorerie",
      value: kpis.tresorerie ?? 0,
      sub: tresorerieSaine ? "Sain ✓" : "Attention",
      subColor: tresorerieSaine ? "text-green-600" : "text-red-600",
      equiv: (kpis.tresorerie ?? 0) !== 0 ? `≈ ${toEUR(kpis.tresorerie)} € / ${toUSD(kpis.tresorerie)} $` : null,
      href: "/tresorerie",
      valueFormat: null,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Link key={c.id} href={c.href}>
          <Card className="transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <c.icon className="h-4 w-4" />
                {c.title}
              </CardTitle>
              {c.id === "tresorerie" && tresorerieSaine && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </CardHeader>
            <CardContent>
              {c.id === "marches" ? (
                <p className="text-2xl font-bold">{c.valueFormat?.(c.value) ?? c.value}</p>
              ) : (
                <div className="text-2xl font-bold">
                  <MontantDisplay montant={c.value} deviseCode="XOF" />
                </div>
              )}
              <p className={`text-xs mt-1 ${c.subColor}`}>{c.sub}</p>
              {c.equiv && (
                <p className="text-xs text-muted-foreground mt-1">Équiv. {c.equiv}</p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
