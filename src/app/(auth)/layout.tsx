export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* ── Panneau gauche (desktop) / Header (mobile) ── */}
      <div className="emerald-gradient relative flex flex-col items-center justify-center px-8 py-12 text-white md:w-1/2 md:py-0">
        {/* Cercles décoratifs flous */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-10 right-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
        </div>

        <div className="relative z-10 text-center">
          <span className="material-icons mb-4 text-6xl opacity-90">payments</span>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Emeraude Business</h1>
          <p className="mt-3 max-w-xs text-sm text-white/80">
            Gestion de trésorerie et de marchés pour votre entreprise
          </p>
        </div>

        {/* Vague SVG en bas du panneau */}
        <svg
          className="absolute bottom-0 left-0 w-full md:hidden"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L0,120Z"
            fill="hsl(140 14% 97%)"
          />
        </svg>
      </div>

      {/* ── Panneau droit : formulaire ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-8 md:px-12">
        <div className="-mt-12 w-full max-w-md md:mt-0">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-muted-foreground">
          Confidentialité · Aide · Conditions
        </p>
      </div>
    </div>
  );
}
