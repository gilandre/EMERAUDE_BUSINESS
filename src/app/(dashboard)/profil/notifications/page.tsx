"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Bell, Loader2 } from "lucide-react";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

const ALERT_TYPES = [
  { code: "TRESORERIE_SEUIL", label: "Seuil trésorerie" },
  { code: "ACOMPTE_RECU", label: "Accompte reçu" },
  { code: "DECAISSEMENT_VALIDE", label: "Décaissement validé" },
  { code: "MARCHE_CREE", label: "Nouveau marché" },
  { code: "DEADLINE_APPROCHANT", label: "Échéance approchant" },
];

export default function ProfilNotificationsPage() {
  const queryClient = useQueryClient();
  const [canalInApp, setCanalInApp] = useState(true);
  const [canalEmail, setCanalEmail] = useState(true);
  const [canalPush, setCanalPush] = useState(false);
  const [alertTypes, setAlertTypes] = useState<string[]>([]);
  const [quietHoursStart, setQuietHoursStart] = useState("");
  const [quietHoursEnd, setQuietHoursEnd] = useState("");
  const [digestFrequency, setDigestFrequency] = useState("realtime");
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    setPushSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window
    );
  }, []);

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setCanalInApp(data.canalInApp ?? true);
          setCanalEmail(data.canalEmail ?? true);
          setCanalPush(data.canalPush ?? false);
          setAlertTypes(Array.isArray(data.alertTypes) ? data.alertTypes : []);
          setQuietHoursStart(data.quietHoursStart ?? "");
          setQuietHoursEnd(data.quietHoursEnd ?? "");
          setDigestFrequency(data.digestFrequency ?? "realtime");
        }
      });
  }, []);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canalInApp,
          canalEmail,
          canalPush,
          alertTypes,
          quietHoursStart: quietHoursStart || null,
          quietHoursEnd: quietHoursEnd || null,
          digestFrequency,
        }),
      });
      if (!res.ok) throw new Error("Erreur sauvegarde");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const toggleAlertType = (code: string) => {
    setAlertTypes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const requestPushPermission = async () => {
    if (!pushSupported) return;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      alert("Push non configuré: définir NEXT_PUBLIC_VAPID_PUBLIC_KEY");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const key = urlBase64ToUint8Array(vapidKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key as BufferSource,
      });
      const json = sub.toJSON();
      await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        }),
      });
      setCanalPush(true);
    } catch (err) {
      console.error("Push subscription failed:", err);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Préférences de notifications</h1>
        <p className="text-muted-foreground">
          Configurez les canaux et types d&apos;alertes que vous souhaitez recevoir.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Canaux
          </CardTitle>
          <CardDescription>Activer ou désactiver les canaux de notification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Dans l&apos;application</Label>
            <Button
              variant={canalInApp ? "default" : "outline"}
              size="sm"
              onClick={() => setCanalInApp(!canalInApp)}
            >
              {canalInApp ? "Activé" : "Désactivé"}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <Label>Email</Label>
            <Button
              variant={canalEmail ? "default" : "outline"}
              size="sm"
              onClick={() => setCanalEmail(!canalEmail)}
            >
              {canalEmail ? "Activé" : "Désactivé"}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <Label>Push navigateur</Label>
            {pushSupported ? (
              <Button
                variant={canalPush ? "default" : "outline"}
                size="sm"
                onClick={canalPush ? () => setCanalPush(false) : requestPushPermission}
              >
                {canalPush ? "Activé" : "Activer"}
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">Non supporté</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Types d&apos;alertes</CardTitle>
          <CardDescription>
            Choisissez les types d&apos;alertes à recevoir (vide = toutes)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ALERT_TYPES.map((a) => (
              <Button
                key={a.code}
                variant={alertTypes.includes(a.code) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleAlertType(a.code)}
              >
                {a.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Heures de silence</CardTitle>
          <CardDescription>
            Ne pas notifier pendant cette plage horaire (ex: 22:00 - 08:00)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Début</Label>
              <Input
                type="time"
                value={quietHoursStart}
                onChange={(e) => setQuietHoursStart(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Fin</Label>
              <Input
                type="time"
                value={quietHoursEnd}
                onChange={(e) => setQuietHoursEnd(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fréquence digest</CardTitle>
          <CardDescription>Regrouper les notifications ou les recevoir en temps réel</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={digestFrequency}
            onValueChange={setDigestFrequency}
            options={[
              { value: "realtime", label: "Temps réel" },
              { value: "daily", label: "Quotidien" },
              { value: "weekly", label: "Hebdomadaire" },
            ]}
          />
        </CardContent>
      </Card>

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enregistrement...
          </>
        ) : (
          "Enregistrer"
        )}
      </Button>
    </div>
  );
}
