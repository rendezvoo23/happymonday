import { createContext, useContext, useState, type ReactNode, useCallback } from 'react';
import { addMonths, subMonths } from 'date-fns';

interface DateContextType {
    selectedDate: Date;
    setDate: (date: Date) => void;
    nextMonth: () => void;
    prevMonth: () => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({ children }: { children: ReactNode }) {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    const nextMonth = useCallback(() => {
        setSelectedDate(prev => addMonths(prev, 1));
    }, []);

    const prevMonth = useCallback(() => {
        setSelectedDate(prev => subMonths(prev, 1));
    }, []);

    return (
        <DateContext.Provider value={{
            selectedDate,
            setDate: setSelectedDate,
            nextMonth,
            prevMonth
        }}>
            {children}
        </DateContext.Provider>
    );
}

export function useDate() {
    const context = useContext(DateContext);
    if (context === undefined) {
        throw new Error('useDate must be used within a DateProvider');
    }
    return context;
}
