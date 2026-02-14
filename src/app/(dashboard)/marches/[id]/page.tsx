"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MontantDisplay } from "@/components/devises/MontantDisplay";
import { MarcheDetailHeader } from "@/components/marches/MarcheDetailHeader";
import { MarcheKPICard } from "@/components/marches/MarcheKPICard";
import { MarcheConversionWidget } from "@/components/marches/MarcheConversionWidget";
import { RatioFinancierWidget } from "@/components/marches/RatioFinancierWidget";
import { AlertesActivesWidget } from "@/components/marches/AlertesActivesWidget";
import { AccomptesList } from "@/components/marches/AccomptesList";
import { AccompteForm } from "@/components/marches/AccompteForm";
import { DecaissementsList } from "@/components/marches/DecaissementsList";
import { DecaissementForm } from "@/components/marches/DecaissementForm";
import { PrefinancementPanel } from "@/components/marches/PrefinancementPanel";
import { MarcheVueEnsembleTab } from "@/components/marches/MarcheVueEnsembleTab";
import { MarcheAlertesTab } from "@/components/marches/MarcheAlertesTab";
import { MarcheHistoriqueTab } from "@/components/marches/MarcheHistoriqueTab";
import { MarcheForm } from "@/components/marches/MarcheForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function MarcheDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;
  const tabParam = searchParams.get("tab") ?? "vue-ensemble";

  const [activeTab, setActiveTab] = useState(tabParam);
  const [editOpen, setEditOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/marches/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erreur lors de la suppression");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Marché supprimé");
      router.push("/marches");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleDelete = () => {
    if (confirm("Supprimer ce marché ? Cette action est irréversible (accomptes, décaissements et préfinancements seront supprimés).")) {
      deleteMutation.mutate();
    }
  };

  useEffect(() => {
    const t = searchParams.get("tab") ?? "vue-ensemble";
    if (["vue-ensemble", "accomptes", "decaissements", "prefinancement", "alertes", "historique"].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const setTab = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/marches/${id}?${params.toString()}`, { scroll: false });
  };

  const { data: marche, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["marche", id],
    queryFn: async () => {
      const res = await fetch(`/api/marches/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Marché introuvable");
      }
      return res.json();
    },
    enabled: !!id,
    retry: 1,
  });

  const sparklineData = useMemo(() => {
    if (!marche?.accomptes || !marche?.decaissements) return [];
    const byDate = new Map<string, { enc: number; dec: number }>();
    const add = (date: string, enc: number, dec: number) => {
      const cur = byDate.get(date) ?? { enc: 0, dec: 0 };
      cur.enc += enc;
      cur.dec += dec;
      byDate.set(date, cur);
    };
    marche.accomptes.forEach((a: { dateEncaissement: string; montant: number }) => {
      add(a.dateEncaissement.slice(0, 10), a.montant, 0);
    });
    marche.decaissements.forEach((d: { dateDecaissement: string; montant: number }) => {
      add(d.dateDecaissement.slice(0, 10), 0, d.montant);
    });
    const dates = Array.from(byDate.keys()).sort();
    let cumulEnc = 0;
    let cumulDec = 0;
    const result: { date: string; value: number }[] = [];
    for (const d of dates) {
      const ev = byDate.get(d)!;
      cumulEnc += ev.enc;
      cumulDec += ev.dec;
      result.push({ date: d, value: cumulEnc - cumulDec });
    }
    return result;
  }, [marche?.accomptes, marche?.decaissements]);

  const budgetSparkline = useMemo(() => {
    if (!marche?.montant) return [];
    const base = sparklineData.length ? sparklineData.map((d) => ({ ...d, value: marche.montant })) : [];
    if (base.length === 0) return [{ date: new Date().toISOString().slice(0, 10), value: marche.montant }];
    return base;
  }, [marche?.montant, sparklineData]);

  const encaisseSparkline = useMemo(() => {
    if (!marche?.accomptes?.length) return sparklineData.length ? sparklineData.map((d) => ({ ...d, value: 0 })) : [];
    const byDate = new Map<string, number>();
    marche.accomptes.forEach((a: { dateEncaissement: string; montant: number }) => {
      const d = a.dateEncaissement.slice(0, 10);
      byDate.set(d, (byDate.get(d) ?? 0) + a.montant);
    });
    const dates = Array.from(byDate.keys()).sort();
    let cumul = 0;
    return dates.map((d) => {
      cumul += byDate.get(d)!;
      return { date: d, value: cumul };
    });
  }, [marche?.accomptes, sparklineData]);

  const decaisseSparkline = useMemo(() => {
    if (!marche?.decaissements?.length) return sparklineData.length ? sparklineData.map((d) => ({ ...d, value: 0 })) : [];
    const byDate = new Map<string, number>();
    marche.decaissements.forEach((d: { dateDecaissement: string; montant: number }) => {
      const key = d.dateDecaissement.slice(0, 10);
      byDate.set(key, (byDate.get(key) ?? 0) + d.montant);
    });
    const dates = Array.from(byDate.keys()).sort();
    let cumul = 0;
    return dates.map((d) => {
      cumul += byDate.get(d)!;
      return { date: d, value: cumul };
    });
  }, [marche?.decaissements, sparklineData]);

  const alertesActives = useMemo(() => {
    const syn = marche?.synthese ?? {};
    const budget = marche?.montant ?? 0;
    const solde = syn.solde ?? 0;
    const dateFin = marche?.dateFin;
    const list: { id: string; type: "warning" | "info" | "deadline"; libelle: string; date?: string; detail?: string }[] = [];
    if (solde > 0 && solde < budget * 0.1) {
      list.push({
        id: "treso-faible",
        type: "warning",
        libelle: "Trésorerie faible",
        detail: "Il y a 2h",
      });
    }
    if (dateFin) {
      const df = new Date(dateFin);
      const jours = Math.ceil((df.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      if (jours <= 30) {
        list.push({
          id: "deadline",
          type: "deadline",
          libelle: `Deadline dans ${jours} jours`,
          date: df.toLocaleDateString("fr-FR"),
        });
      }
    }
    return list;
  }, [marche]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !marche) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error?.message ?? "Marché introuvable."}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Réessayer
          </Button>
          <Link href="/marches">
            <Button variant="outline">Retour à la liste</Button>
          </Link>
        </div>
      </div>
    );
  }

  const syn = marche.synthese ?? {};
  const budget = marche.montant ?? 0;
  const totalEnc = syn.totalEncaissements ?? 0;
  const totalDec = syn.totalDecaissements ?? 0;
  const solde = syn.solde ?? 0;
  const budgetXOF = marche.montantTotalXOF ?? marche.montant ?? 0;
  const totalEncXOF = syn.totalEncaissementsXOF ?? totalEnc;
  const totalDecXOF = syn.totalDecaissementsXOF ?? totalDec;
  const soldeXOF = syn.soldeXOF ?? solde;
  const prefinancementMax = syn.prefinancementMax ?? 0;
  const prefinancementUtilise = syn.prefinancementUtilise ?? 0;
  const soldeDisponible = solde + prefinancementMax - prefinancementUtilise;
  const deviseCode = marche.deviseCode ?? "XOF";
  const montantTotalXOF = marche.montantTotalXOF ?? marche.montant ?? 0;

  const tauxEur = 655.957;

  return (
    <div className="space-y-6">
      <MarcheDetailHeader
        libelle={marche.libelle}
        code={marche.code}
        deviseCode={deviseCode}
        statut={marche.statut ?? "actif"}
        onEdit={() => setEditOpen(true)}
        onCloturer={() => {
          if (confirm("Clôturer ce marché ? Le statut passera à « terminé ».")) {
            fetch(`/api/marches/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ statut: "termine" }),
            })
              .then((r) => r.json())
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ["marche", id] });
                queryClient.invalidateQueries({ queryKey: ["marches"] });
                toast.success("Marché clôturé");
                refetch();
              })
              .catch(() => toast.error("Erreur lors de la clôture"));
          }
        }}
        onExporter={() => {
          const data = {
            marche: { ...marche, synthese: syn },
            exportDate: new Date().toISOString(),
          };
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `marche-${marche.code}-${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success("Export téléchargé");
        }}
        onDelete={handleDelete}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <MarcheForm
            mode="edit"
            marcheId={id}
            initialData={{
              libelle: marche.libelle,
              montant: marche.montant,
              deviseCode: marche.deviseCode,
              dateDebut: marche.dateDebut ? String(marche.dateDebut).slice(0, 10) : undefined,
              dateFin: marche.dateFin ? String(marche.dateFin).slice(0, 10) : undefined,
              statut: marche.statut ?? "actif",
            }}
            onSuccess={() => setEditOpen(false)}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MarcheKPICard
          title="BUDGET"
          icon="💼"
          montant={budget}
          montantEur={deviseCode === "XOF" ? budget / tauxEur : undefined}
          montantXOF={deviseCode !== "XOF" ? budgetXOF : undefined}
          deviseCode={deviseCode}
          pourcent={100}
          pourcentMax={100}
          couleur="default"
          sparklineData={budgetSparkline}
        />
        <MarcheKPICard
          title="ENCAISSÉ"
          icon="💚"
          montant={totalEnc}
          montantEur={deviseCode === "XOF" ? totalEnc / tauxEur : undefined}
          montantXOF={deviseCode !== "XOF" ? totalEncXOF : undefined}
          deviseCode={deviseCode}
          pourcent={budget > 0 ? (totalEnc / budget) * 100 : 0}
          pourcentMax={100}
          couleur="green"
          sparklineData={encaisseSparkline}
        />
        <MarcheKPICard
          title="DÉCAISSÉ"
          icon="🔴"
          montant={totalDec}
          montantEur={deviseCode === "XOF" ? totalDec / tauxEur : undefined}
          montantXOF={deviseCode !== "XOF" ? totalDecXOF : undefined}
          deviseCode={deviseCode}
          pourcent={budget > 0 ? (totalDec / budget) * 100 : 0}
          pourcentMax={100}
          couleur="red"
          sparklineData={decaisseSparkline}
        />
        <MarcheKPICard
          title="TRÉSORERIE"
          icon="💰"
          montant={solde}
          montantEur={deviseCode === "XOF" ? solde / tauxEur : undefined}
          montantXOF={deviseCode !== "XOF" ? soldeXOF : undefined}
          deviseCode={deviseCode}
          pourcent={budget > 0 ? (solde / budget) * 100 : 0}
          pourcentMax={100}
          couleur="blue"
          sparklineData={sparklineData}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setTab} className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="vue-ensemble">Vue d&apos;ensemble</TabsTrigger>
              <TabsTrigger value="accomptes">Accomptes</TabsTrigger>
              <TabsTrigger value="decaissements">Décaissements</TabsTrigger>
              <TabsTrigger value="prefinancement">Préfinancement</TabsTrigger>
              <TabsTrigger value="alertes">Alertes</TabsTrigger>
              <TabsTrigger value="historique">Historique</TabsTrigger>
            </TabsList>

            <TabsContent value="vue-ensemble" className="mt-4">
              <MarcheVueEnsembleTab
                marche={marche}
                accomptes={marche.accomptes ?? []}
                decaissements={marche.decaissements ?? []}
                synthese={syn}
              />
            </TabsContent>

            <TabsContent value="accomptes" className="mt-4 space-y-4">
              <AccomptesList marcheId={id} deviseCode={deviseCode} />
              <AccompteForm marcheId={id} deviseCode={deviseCode} />
            </TabsContent>

            <TabsContent value="decaissements" className="mt-4 space-y-4">
              <DecaissementsList marcheId={id} deviseCode={deviseCode} soldeDisponible={soldeDisponible} />
              <DecaissementForm
                marcheId={id}
                soldeDisponible={soldeDisponible}
                deviseCode={deviseCode}
              />
            </TabsContent>

            <TabsContent value="prefinancement" className="mt-4">
              <PrefinancementPanel marcheId={id} deviseCode={deviseCode} />
            </TabsContent>

            <TabsContent value="alertes" className="mt-4">
              <MarcheAlertesTab marcheId={id} />
            </TabsContent>

            <TabsContent value="historique" className="mt-4">
              <MarcheHistoriqueTab marcheId={id} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          {montantTotalXOF > 0 && (
            <MarcheConversionWidget
              montantBase={montantTotalXOF}
              deviseBase="XOF"
              showBase={true}
            />
          )}
          <RatioFinancierWidget
            totalEncaissements={totalEnc}
            totalDecaissements={totalDec}
            budget={budget}
            margeBrute={solde}
            deviseCode={deviseCode}
            objectifMarge={30}
          />
          <AlertesActivesWidget alertes={alertesActives} marcheId={id} />
        </div>
      </div>
    </div>
  );
}
