import { useDate } from "@/context/DateContext";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/lib/supabaseClient";
import type { Tables } from "@/types/supabase";
import {
  endOfMonth,
  format,
  getDaysInMonth,
  startOfMonth,
  subMonths,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

type Transaction = Tables<"transactions">;

interface TransactionWithCategory extends Transaction {
  categories: Pick<
    Tables<"categories">,
    "id" | "name" | "color" | "icon"
  > | null;
}

interface AnalyticsChartsProps {
  transactions: TransactionWithCategory[];
}

interface MonthData {
  day: number;
  amount: number;
}

export function AnalyticsCharts({ transactions }: AnalyticsChartsProps) {
  const { selectedDate } = useDate();
  const { formatAmount } = useCurrency();
  const [prevMonthTransactions, setPrevMonthTransactions] = useState<
    Transaction[]
  >([]);

  const prevMonth = subMonths(selectedDate, 1);

  // Load previous month transactions
  useEffect(() => {
    const loadPrevMonth = async () => {
      const start = startOfMonth(prevMonth).toISOString();
      const end = endOfMonth(prevMonth).toISOString();

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("occurred_at", start)
        .lt("occurred_at", end)
        .is("deleted_at", null)
        .eq("direction", "expense");

      if (!error && data) {
        setPrevMonthTransactions(data);
      }
    };
    loadPrevMonth();
  }, [prevMonth]);

  // Current month data
  const currentMonthData = useMemo(() => {
    const daysInMonth = getDaysInMonth(selectedDate);
    const expenses = transactions.filter((t) => t.direction === "expense");

    const dayData: MonthData[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = format(
        new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d),
        "yyyy-MM-dd"
      );
      const dayExpenses = expenses
        .filter((t) => t.occurred_at.startsWith(dayStr))
        .reduce((acc, t) => acc + t.amount, 0);
      dayData.push({ day: d, amount: dayExpenses });
    }
    return dayData;
  }, [transactions, selectedDate]);

  // Previous month data
  const prevMonthData = useMemo(() => {
    const daysInMonth = getDaysInMonth(prevMonth);

    const dayData: MonthData[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = format(
        new Date(prevMonth.getFullYear(), prevMonth.getMonth(), d),
        "yyyy-MM-dd"
      );
      const dayExpenses = prevMonthTransactions
        .filter((t) => t.occurred_at.startsWith(dayStr))
        .reduce((acc, t) => acc + t.amount, 0);
      dayData.push({ day: d, amount: dayExpenses });
    }
    return dayData;
  }, [prevMonthTransactions, prevMonth]);

  // Totals
  const currentTotal = currentMonthData.reduce((acc, d) => acc + d.amount, 0);
  const prevTotal = prevMonthData.reduce((acc, d) => acc + d.amount, 0);

  // Change calculation
  const absoluteChange = currentTotal - prevTotal;
  const percentChange = prevTotal > 0 ? (absoluteChange / prevTotal) * 100 : 0;
  const isIncrease = absoluteChange > 0;

  const currentMonthLabel = format(selectedDate, "MMMM yyyy");
  const prevMonthLabel = format(prevMonth, "MMMM yyyy");

  // Combine data for overlapping chart - use max days between both months
  const combinedData = useMemo(() => {
    const maxDays = Math.max(currentMonthData.length, prevMonthData.length);
    const data = [];
    for (let i = 0; i < maxDays; i++) {
      data.push({
        day: i + 1,
        current: currentMonthData[i]?.amount || 0,
        previous: prevMonthData[i]?.amount || 0,
      });
    }
    return data;
  }, [currentMonthData, prevMonthData]);

  return (
    <div className="w-full space-y-4">
      {/* Combined Month Comparison Chart */}
      <div className="bg-white/50 rounded-3xl p-4 backdrop-blur-sm">
        {/* Legend Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#FF453A]" />
              <span className="text-sm font-medium text-gray-700">
                {currentMonthLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#8E8E93]" />
              <span className="text-sm font-medium text-gray-500">
                {prevMonthLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Totals Row */}
        <div className="flex items-center justify-between mb-4 px-2">
          <div>
            <p className="text-xs text-gray-500">Current</p>
            <p className="text-lg font-bold text-gray-900">
              {formatAmount(currentTotal)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Previous</p>
            <p className="text-lg font-bold text-gray-600">
              {formatAmount(prevTotal)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={combinedData}>
              <defs>
                <linearGradient
                  id="colorCurrentMonth"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#FF453A" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#FF453A" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorPrevMonth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8E8E93" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8E8E93" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                interval={6}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
                formatter={(value: number) => [formatAmount(value)]}
                labelFormatter={(label) => `Day ${label}`}
              />
              {/* Previous month behind (drawn first) */}
              <Area
                type="monotone"
                dataKey="previous"
                stroke="#8E8E93"
                fillOpacity={1}
                fill="url(#colorPrevMonth)"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              {/* Current month on top */}
              <Area
                type="monotone"
                dataKey="current"
                stroke="#FF453A"
                fillOpacity={1}
                fill="url(#colorCurrentMonth)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Change Summary integrated at bottom */}
        <div className="mt-4 pt-4 border-t border-gray-200/50">
          <div className="flex items-center justify-center gap-3">
            <span className="text-sm text-gray-500">Change:</span>
            <span
              className={`text-lg font-bold ${
                isIncrease ? "text-red-500" : "text-green-600"
              }`}
            >
              {isIncrease ? "+" : ""}
              {formatAmount(absoluteChange)}
            </span>
            <span
              className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                isIncrease
                  ? "bg-red-100 text-red-600"
                  : "bg-green-100 text-green-600"
              }`}
            >
              {isIncrease ? "↑" : "↓"} {Math.abs(percentChange).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
