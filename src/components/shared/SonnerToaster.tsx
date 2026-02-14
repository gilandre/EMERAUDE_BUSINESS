"use client";

import dynamic from "next/dynamic";

const Toaster = dynamic(
  () => import("sonner").then((m) => ({ default: m.Toaster })),
  { ssr: false }
);

export function SonnerToaster() {
  return <Toaster position="top-right" richColors closeButton />;
}
