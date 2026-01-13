import { addMonths, isSameMonth, subMonths } from "date-fns";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface DateContextType {
  selectedDate: Date;
  setDate: (date: Date) => void;
  nextMonth: () => void;
  prevMonth: () => void;
  canGoNext: boolean;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const canGoNext = useMemo(() => {
    const today = new Date();
    return !isSameMonth(selectedDate, today) && selectedDate < today;
  }, [selectedDate]);

  const nextMonth = useCallback(() => {
    if (!canGoNext) return;
    setSelectedDate((prev) => addMonths(prev, 1));
  }, [canGoNext]);

  const prevMonth = useCallback(() => {
    setSelectedDate((prev) => subMonths(prev, 1));
  }, []);

  return (
    <DateContext.Provider
      value={{
        selectedDate,
        setDate: setSelectedDate,
        nextMonth,
        prevMonth,
        canGoNext,
      }}
    >
      {children}
    </DateContext.Provider>
  );
}

export function useDate() {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error("useDate must be used within a DateProvider");
  }
  return context;
}
