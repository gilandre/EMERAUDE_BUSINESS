"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Email requis");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur");
        return;
      }
      setSent(true);
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <span className="material-icons mb-4 text-5xl text-primary">mark_email_read</span>
        <h2 className="text-2xl font-bold text-neutral-medium">Email envoyé</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Si cet email existe, un lien de réinitialisation vous a été envoyé.
          Vérifiez votre boîte de réception.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-input bg-background px-6 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <span className="material-icons text-lg">arrow_back</span>
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <span className="material-icons mb-2 text-5xl text-primary">lock_reset</span>
        <h2 className="text-2xl font-bold text-neutral-medium">Mot de passe oublié</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <span className="material-icons text-base">error_outline</span>
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Adresse email
          </label>
          <div className="relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">
              mail_outline
            </span>
            <input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-lg border border-input bg-background py-3 pl-12 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Envoi..." : "Envoyer le lien"}
          {!loading && <span className="material-icons text-xl">send</span>}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:text-primary/80">
          Retour à la connexion
        </Link>
      </p>
    </>
  );
}
