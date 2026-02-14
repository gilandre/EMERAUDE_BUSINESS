import { Skeleton } from "@/components/ui/skeleton";

export default function MarcheNouveauLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-96 max-w-2xl" />
    </div>
  );
}
