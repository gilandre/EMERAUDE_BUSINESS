import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold">Emeraude Business</h1>
      <p className="mt-2 text-muted-foreground">Gestion de marchés BTP</p>
      <div className="mt-6 flex gap-4">
        <Link href="/login" className="text-primary underline">
          Connexion
        </Link>
        <Link href="/register" className="text-primary underline">
          Inscription
        </Link>
        <Link href="/dashboard" className="text-primary underline">
          Dashboard
        </Link>
      </div>
    </main>
  );
}
