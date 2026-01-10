import { Skeleton } from "@/components/ui/Skeleton";

export function TransactionItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-md rounded-2xl mb-3 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center gap-4">
        {/* Category Icon Circle */}
        <Skeleton className="w-10 h-10 rounded-full" />

        <div>
          {/* Category Label */}
          <Skeleton className="h-4 w-24 mb-1.5" />
          {/* Date/Note */}
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Actions Placeholder - usually hidden, but we preserve space if needed or just align amount */}
        {/* Amount */}
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
