import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="正在加载页面" aria-busy="true">
      <span className="sr-only">正在加载页面…</span>
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="mb-6 flex justify-between gap-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="space-y-4">
          {[0, 1, 2, 3, 4].map((row) => (
            <Skeleton key={row} className="h-11 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
