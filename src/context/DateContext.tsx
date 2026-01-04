import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DateContextType {
    selectedDate: Date;
    setDate: (date: Date) => void;
}

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({ children }: { children: ReactNode }) {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    return (
        <DateContext.Provider value={{ selectedDate, setDate: setSelectedDate }}>
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
