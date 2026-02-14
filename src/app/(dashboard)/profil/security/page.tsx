"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2, Copy } from "lucide-react";

export default function ProfilSecurityPage() {
  const [totpCode, setTotpCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const { data: userData } = useQuery({
    queryKey: ["user-2fa"],
    queryFn: async () => {
      const res = await fetch("/api/users/me");
      if (!res.ok) return null;
      const d = await res.json();
      return d;
    },
  });

  const setupTotp = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/totp/setup", { method: "POST" });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Erreur");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes ?? []);
    },
  });

  const enableTotp = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/totp/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: totpCode }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Erreur");
      }
      return res.json();
    },
    onSuccess: () => {
      setTotpCode("");
      window.location.reload();
    },
  });

  const disableTotp = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: totpCode }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error ?? "Erreur");
      }
      return res.json();
    },
    onSuccess: () => {
      setTotpCode("");
      window.location.reload();
    },
  });

  const totpEnabled = userData?.totpEnabled ?? false;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sécurité</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentification à deux facteurs (2FA)
          </CardTitle>
          <CardDescription>
            Protégez votre compte avec un code généré par une application (Google Authenticator, Authy, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {totpEnabled ? (
            <div>
              <p className="text-sm text-green-600 font-medium mb-2">2FA activé</p>
              <div className="flex gap-2 items-center">
                <Input
                  type="text"
                  placeholder="Code pour désactiver"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  maxLength={8}
                  className="max-w-[160px]"
                />
                <Button
                  variant="destructive"
                  onClick={() => disableTotp.mutate()}
                  disabled={!totpCode || totpCode.length < 6 || disableTotp.isPending}
                >
                  {disableTotp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Désactiver"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!setupTotp.data ? (
                <Button onClick={() => setupTotp.mutate()} disabled={setupTotp.isPending}>
                  {setupTotp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Configurer 2FA"}
                </Button>
              ) : (
                <div className="space-y-4">
                  {setupTotp.data.qrCode && (
                    <div>
                      <Label>Scannez avec votre application 2FA</Label>
                      <img src={setupTotp.data.qrCode} alt="QR Code" className="mt-2 w-48 h-48" />
                    </div>
                  )}
                  {backupCodes.length > 0 && (
                    <div>
                      <Label>Codes de secours (sauvegardez-les)</Label>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {backupCodes.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 font-mono text-sm">
                            <span>{c}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigator.clipboard.writeText(c)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label>Entrez le code pour activer</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        type="text"
                        placeholder="123456"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={8}
                        className="max-w-[120px]"
                      />
                      <Button
                        onClick={() => enableTotp.mutate()}
                        disabled={totpCode.length < 6 || enableTotp.isPending}
                      >
                        {enableTotp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Activer"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
