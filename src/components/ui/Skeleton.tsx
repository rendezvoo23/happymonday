import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-gray-200/50 dark:bg-gray-700/50",
        className
      )}
      {...props}
    />
  );
}
