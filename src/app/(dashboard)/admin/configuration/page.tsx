"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, MessageSquare, Server, Database, Globe, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminConfigurationPage() {
  const queryClient = useQueryClient();

  const { data: merged, isLoading: loadingMerged } = useQuery({
    queryKey: ["settings-merged"],
    queryFn: async () => {
      const res = await fetch("/api/settings/merged");
      if (!res.ok) throw new Error("Erreur chargement");
      return res.json();
    },
  });

  const { data: canaux, isLoading: loadingCanaux } = useQuery({
    queryKey: ["settings-canaux"],
    queryFn: async () => {
      const res = await fetch("/api/settings/canaux");
      if (!res.ok) return { email: {}, sms: {} };
      return res.json();
    },
  });

  const { data: configList } = useQuery({
    queryKey: ["config-list"],
    queryFn: async () => {
      const res = await fetch("/api/config");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const [sysForm, setSysForm] = useState({ API_URL: "", NEXTAUTH_URL: "" });
  const [smtpForm, setSmtpForm] = useState({
    host: "",
    port: "587",
    user: "",
    password: "",
    from: "",
    isEnabled: false,
  });
  const [smsForm, setSmsForm] = useState({
    accountSid: "",
    phoneNumber: "",
    authToken: "",
    isEnabled: false,
  });

  useEffect(() => {
    if (merged?.api) {
      setSysForm({
        API_URL: merged.api.API_URL?.value ?? "",
        NEXTAUTH_URL: merged.api.NEXTAUTH_URL?.value ?? "",
      });
    }
  }, [merged]);

  useEffect(() => {
    if (canaux?.email) {
      setSmtpForm((p) => ({
        ...p,
        host: canaux.email.host ?? "",
        port: String(canaux.email.port ?? 587),
        user: canaux.email.user ?? "",
        from: canaux.email.from ?? "",
        isEnabled: canaux.email.isEnabled ?? false,
      }));
    }
  }, [canaux?.email]);

  useEffect(() => {
    if (canaux?.sms) {
      setSmsForm((p) => ({
        ...p,
        accountSid: canaux.sms.accountSid ?? "",
        phoneNumber: canaux.sms.phoneNumber ?? "",
        isEnabled: canaux.sms.isEnabled ?? false,
      }));
    }
  }, [canaux?.sms]);

  const saveConfigMutation = useMutation({
    mutationFn: async ({ cle, valeur }: { cle: string; valeur: string }) => {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cle, valeur, module: "system" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-list"] });
      queryClient.invalidateQueries({ queryKey: ["settings-merged"] });
      toast.success("Configuration enregistrée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveCanauxMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch("/api/settings/canaux", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Erreur");
      return d;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-canaux"] });
      queryClient.invalidateQueries({ queryKey: ["alertes-canaux"] });
      toast.success("Configuration des canaux enregistrée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSaveSystem = () => {
    saveConfigMutation.mutate({ cle: "API_URL", valeur: sysForm.API_URL });
    saveConfigMutation.mutate({ cle: "NEXTAUTH_URL", valeur: sysForm.NEXTAUTH_URL });
  };

  const handleSaveSmtp = () => {
    saveCanauxMutation.mutate({
      email: {
        host: smtpForm.host,
        port: smtpForm.port,
        user: smtpForm.user,
        password: smtpForm.password || undefined,
        from: smtpForm.from,
        isEnabled: smtpForm.isEnabled,
      },
    });
  };

  const handleSaveSms = () => {
    saveCanauxMutation.mutate({
      sms: {
        accountSid: smsForm.accountSid,
        phoneNumber: smsForm.phoneNumber,
        authToken: smsForm.authToken || undefined,
        isEnabled: smsForm.isEnabled,
      },
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Configuration système</h1>
        <p className="text-muted-foreground">
          Paramètres centralisés : API, base de données, SMTP, SMS. Les modifications sont persistées en base.
        </p>
      </div>

      <Tabs defaultValue="system">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            API & Web
          </TabsTrigger>
          <TabsTrigger value="db" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Base de données
          </TabsTrigger>
          <TabsTrigger value="smtp" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            SMTP
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS (Twilio)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Paramètres API et application web
              </CardTitle>
              <CardDescription>
                Ces valeurs sont stockées en base et peuvent surcharger les variables d&apos;environnement.
                Pour le proxy API (port 3001), définir API_URL dans .env et redémarrer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingMerged ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>URL API (ex: http://localhost:3001)</Label>
                      <Input
                        placeholder="http://localhost:3001"
                        value={sysForm.API_URL}
                        onChange={(e) => setSysForm((p) => ({ ...p, API_URL: e.target.value }))}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Port 3001 si API séparée. URL pour l&apos;app mobile (EXPO_PUBLIC_API_URL).
                      </p>
                    </div>
                    <div>
                      <Label>URL application web (NEXTAUTH_URL)</Label>
                      <Input
                        placeholder="http://localhost:3000"
                        value={sysForm.NEXTAUTH_URL}
                        onChange={(e) => setSysForm((p) => ({ ...p, NEXTAUTH_URL: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveSystem} disabled={saveConfigMutation.isPending}>
                    {saveConfigMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="db" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Base de données
              </CardTitle>
              <CardDescription>
                La connexion est définie uniquement dans .env (DATABASE_URL) pour des raisons de sécurité.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMerged ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="space-y-2">
                  <div>
                    <Label>DATABASE_URL</Label>
                    <Input
                      value={merged?.db?.DATABASE_URL?.value ?? "••••••••"}
                      disabled
                      className="font-mono text-sm"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Modifier le fichier .env à la racine du projet, puis redémarrer l&apos;application.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smtp" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Configuration SMTP
              </CardTitle>
              <CardDescription>
                Stockée en base (ConfigurationCanal). Priorité : DB puis variables .env.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingCanaux ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="smtp-enabled"
                      checked={smtpForm.isEnabled}
                      onChange={(e) => setSmtpForm((p) => ({ ...p, isEnabled: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="smtp-enabled">Canal email activé</Label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Serveur SMTP</Label>
                      <Input
                        placeholder="smtp.example.com"
                        value={smtpForm.host}
                        onChange={(e) => setSmtpForm((p) => ({ ...p, host: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Port</Label>
                      <Input
                        type="number"
                        placeholder="587"
                        value={smtpForm.port}
                        onChange={(e) => setSmtpForm((p) => ({ ...p, port: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Utilisateur</Label>
                      <Input
                        placeholder="noreply@example.com"
                        value={smtpForm.user}
                        onChange={(e) => setSmtpForm((p) => ({ ...p, user: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Mot de passe (vide = conserver)</Label>
                      <Input
                        type="password"
                        placeholder={canaux?.email?.hasPassword ? "••••••••" : ""}
                        value={smtpForm.password}
                        onChange={(e) => setSmtpForm((p) => ({ ...p, password: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Email expéditeur</Label>
                      <Input
                        placeholder="noreply@example.com"
                        value={smtpForm.from}
                        onChange={(e) => setSmtpForm((p) => ({ ...p, from: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveSmtp} disabled={saveCanauxMutation.isPending}>
                    {saveCanauxMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer SMTP
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Configuration SMS (Twilio)
              </CardTitle>
              <CardDescription>
                Stockée en base. Auth Token peut aussi être défini dans .env (TWILIO_AUTH_TOKEN).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingCanaux ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sms-enabled"
                      checked={smsForm.isEnabled}
                      onChange={(e) => setSmsForm((p) => ({ ...p, isEnabled: e.target.checked }))}
                      className="rounded"
                    />
                    <Label htmlFor="sms-enabled">Canal SMS activé</Label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Account SID</Label>
                      <Input
                        placeholder="ACxxxx..."
                        value={smsForm.accountSid}
                        onChange={(e) => setSmsForm((p) => ({ ...p, accountSid: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Numéro expéditeur</Label>
                      <Input
                        placeholder="+33..."
                        value={smsForm.phoneNumber}
                        onChange={(e) => setSmsForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Auth Token (vide = conserver / .env)</Label>
                      <Input
                        type="password"
                        placeholder={canaux?.sms?.hasAuthToken ? "••••••••" : ""}
                        value={smsForm.authToken}
                        onChange={(e) => setSmsForm((p) => ({ ...p, authToken: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveSms} disabled={saveCanauxMutation.isPending}>
                    {saveCanauxMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer SMS
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Bonnes pratiques
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Secrets</strong> (mots de passe, tokens) : préférence .env, jamais en clair dans la base.</p>
          <p>• <strong>Config non sensible</strong> (URLs, ports) : stockée en base pour centralisation et persistance.</p>
          <p>• <strong>API_URL</strong> : pour le proxy rewrites Next.js, définir dans .env et redémarrer.</p>
          <p>• <strong>Mobile</strong> : EXPO_PUBLIC_API_URL pointe vers l&apos;API (ex: http://10.0.2.2:3001).</p>
        </CardContent>
      </Card>
    </div>
  );
}
