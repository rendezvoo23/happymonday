import { useDate } from "@/context/DateContext";
import { cn } from "@/lib/utils";
import { addMonths, format, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthSelectorProps {
  className?: string;
}

export function MonthSelector({ className }: MonthSelectorProps) {
  const { selectedDate, setDate } = useDate();

  const handlePreviousMonth = () => {
    setDate(subMonths(selectedDate, 1));
  };

  const handleNextMonth = () => {
    setDate(addMonths(selectedDate, 1));
  };

  // Prevent going to future months if desired (optional, but good for finance)
  // const isNextDisabled = isAfter(addMonths(selectedDate, 1), new Date());

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        onClick={handlePreviousMonth}
        className="p-2 rounded-full hover:bg-black/5 transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>

      <button
        type="button"
        className="text-lg font-semibold text-gray-900 min-w-[140px] text-center"
        // Future enhancement: onClick to open month picker modal
      >
        {format(selectedDate, "MMMM yyyy")}
      </button>

      <button
        type="button"
        onClick={handleNextMonth}
        className="p-2 rounded-full hover:bg-black/5 transition-colors"
        aria-label="Next month"
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );
}
