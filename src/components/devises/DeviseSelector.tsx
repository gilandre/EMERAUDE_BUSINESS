"use client";

import { useQuery } from "@tanstack/react-query";
import { Select } from "@/components/ui/select";
import type { Devise } from "@prisma/client";

interface DeviseSelectorProps {
  value?: string;
  onChange: (deviseId: string) => void;
  disabled?: boolean;
}

export function DeviseSelector({
  value,
  onChange,
  disabled,
}: DeviseSelectorProps) {
  const { data: devises, isLoading } = useQuery<Devise[]>({
    queryKey: ["devises"],
    queryFn: async () => {
      const res = await fetch("/api/devises");
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Chargement devises...</div>;
  }

  const options =
    devises?.map((devise) => ({
      value: devise.id,
      label: `${devise.code} - ${devise.symbole} - ${devise.nom}${devise.isDefault ? " (Par défaut)" : ""}`,
    })) ?? [];

  return (
    <Select
      value={value ?? ""}
      onValueChange={onChange}
      options={options}
      placeholder="Sélectionner une devise"
      disabled={disabled}
      className="w-full"
    />
  );
}
