import { useMemo } from "react";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Transaction } from "@/types";
import { useDate } from "@/context/DateContext";

interface AnalyticsChartsProps {
    transactions: Transaction[];
}

export function AnalyticsCharts({ transactions }: AnalyticsChartsProps) {
    const { selectedDate } = useDate();

    const data = useMemo(() => {
        const start = startOfMonth(selectedDate);
        const end = endOfMonth(selectedDate);
        const days = eachDayOfInterval({ start, end });

        return days.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayTransactions = transactions.filter(t => t.date.startsWith(dayStr));

            return {
                date: format(day, 'd'),
                expense: dayTransactions
                    .filter(t => t.type === 'expense')
                    .reduce((acc, t) => acc + t.amount, 0),
                income: dayTransactions
                    .filter(t => t.type === 'income')
                    .reduce((acc, t) => acc + t.amount, 0),
            };
        });
    }, [transactions, selectedDate]);

    return (
        <div className="w-full space-y-8">
            <div className="h-64 w-full bg-white/50 rounded-3xl p-4 backdrop-blur-sm">
                <h3 className="text-sm font-medium text-gray-500 mb-4">Daily Activity</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FF453A" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#FF453A" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#30D158" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#30D158" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                            interval={4}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="income"
                            stroke="#30D158"
                            fillOpacity={1}
                            fill="url(#colorIncome)"
                            strokeWidth={2}
                        />
                        <Area
                            type="monotone"
                            dataKey="expense"
                            stroke="#FF453A"
                            fillOpacity={1}
                            fill="url(#colorExpense)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
