"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    nom: "",
    prenom: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError("");

    const newErrors: Record<string, string> = {};
    if (!form.email) newErrors.email = "Email requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Email invalide";
    if (!form.password) newErrors.password = "Mot de passe requis";
    else if (form.password.length < 8)
      newErrors.password = "Minimum 8 caractères";
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          nom: form.nom || undefined,
          prenom: form.prenom || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setServerError(data.error ?? "Erreur lors de l'inscription");
        setLoading(false);
        return;
      }

      router.push("/login?registered=1");
      router.refresh();
    } catch {
      setServerError("Une erreur est survenue.");
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold text-neutral-medium">Créer un compte</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Renseignez vos informations pour commencer
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {serverError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <span className="material-icons text-base">error_outline</span>
            {serverError}
          </div>
        )}

        {/* Prénom + Nom */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Prénom
            </label>
            <div className="relative">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">
                person
              </span>
              <input
                type="text"
                value={form.prenom}
                onChange={(e) => setForm((p) => ({ ...p, prenom: e.target.value }))}
                placeholder="Jean"
                autoComplete="given-name"
                className="w-full rounded-lg border border-input bg-background py-3 pl-12 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nom
            </label>
            <div className="relative">
              <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">
                person
              </span>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
                placeholder="Dupont"
                autoComplete="family-name"
                className="w-full rounded-lg border border-input bg-background py-3 pl-12 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Adresse email *
          </label>
          <div className="relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">
              alternate_email
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="vous@exemple.com"
              autoComplete="email"
              className={`w-full rounded-lg border bg-background py-3 pl-12 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                errors.email ? "border-destructive" : "border-input"
              }`}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mot de passe *
          </label>
          <div className="relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">
              lock_outline
            </span>
            <input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Min. 8 caractères"
              autoComplete="new-password"
              className={`w-full rounded-lg border bg-background py-3 pl-12 pr-12 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                errors.password ? "border-destructive" : "border-input"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              <span className="material-icons text-xl">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Confirmer le mot de passe *
          </label>
          <div className="relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-xl text-muted-foreground">
              lock_outline
            </span>
            <input
              type={showConfirm ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              placeholder="Répéter le mot de passe"
              autoComplete="new-password"
              className={`w-full rounded-lg border bg-background py-3 pl-12 pr-12 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                errors.confirmPassword ? "border-destructive" : "border-input"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              <span className="material-icons text-xl">
                {showConfirm ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Inscription..." : "S'inscrire"}
          {!loading && <span className="material-icons text-xl">arrow_forward</span>}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary/80">
          Se connecter
        </Link>
      </p>
    </>
  );
}
