import { useDate } from "@/context/DateContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthSelectorProps {
  className?: string;
}

export function MonthSelector({ className }: MonthSelectorProps) {
  const { selectedDate, nextMonth, prevMonth, canGoNext } = useDate();

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        onClick={prevMonth}
        className="p-2 rounded-full hover:bg-black/5 transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>

      <button
        type="button"
        className="text-lg font-semibold text-gray-900 min-w-[140px] text-center"
      >
        {format(selectedDate, "MMMM yyyy")}
      </button>

      <button
        type="button"
        onClick={nextMonth}
        disabled={!canGoNext}
        className={cn(
          "p-2 rounded-full transition-colors",
          canGoNext
            ? "hover:bg-black/5 cursor-pointer"
            : "opacity-20 cursor-not-allowed"
        )}
        aria-label="Next month"
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}
