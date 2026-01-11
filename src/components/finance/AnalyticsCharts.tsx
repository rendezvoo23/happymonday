import { useDate } from "@/context/DateContext";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/supabase";
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  format,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

type TimeRange = "1W" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "ALL";

interface ChartDataPoint {
  label: string;
  current: number;
  previous: number;
  date: string;
}

export function AnalyticsCharts({
  transactions: _initialTransactions,
}: AnalyticsChartsProps) {
  const { formatAmount } = useCurrency();
  const { selectedDate } = useDate();
  const [range, setRange] = useState<TimeRange>("1M");
  const [data, setData] = useState<{
    current: number;
    previous: number;
    combinedData: ChartDataPoint[];
    isIncrease: boolean;
    absoluteChange: number;
    percentChange: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      // Use selectedDate as the reference point instead of current date
      const referenceDate = selectedDate;
      let start: Date;
      const end = endOfDay(referenceDate);
      let prevStart: Date;
      let prevEnd: Date;
      let groupBy: "day" | "month" = "day";

      // Calculate ranges
      switch (range) {
        case "1W":
          start = subWeeks(referenceDate, 1);
          prevEnd = start;
          prevStart = subWeeks(start, 1);
          groupBy = "day";
          break;
        case "1M":
          start = subMonths(referenceDate, 1);
          prevEnd = start;
          prevStart = subMonths(start, 1);
          groupBy = "day";
          break;
        case "3M":
          start = subMonths(referenceDate, 3);
          prevEnd = start;
          prevStart = subMonths(start, 3);
          groupBy = "month";
          break;
        case "6M":
          start = subMonths(referenceDate, 6);
          prevEnd = start;
          prevStart = subMonths(start, 6);
          groupBy = "month";
          break;
        case "1Y":
          start = subYears(referenceDate, 1);
          prevEnd = start;
          prevStart = subYears(start, 1);
          groupBy = "month";
          break;
        case "3Y":
          start = subYears(referenceDate, 3);
          prevEnd = start;
          prevStart = subYears(start, 3);
          groupBy = "month";
          break;
        case "ALL":
          start = new Date(0); // 1970
          prevEnd = referenceDate;
          prevStart = new Date(0); // For ALL, comparison is tricky. Usually 0 or just ignore.
          groupBy = "month";
          break;
      }

      // Fetch Current Range
      const { data: currentTx } = await supabase
        .from("transactions")
        .select("*")
        .gte("occurred_at", start.toISOString())
        .lte("occurred_at", end.toISOString())
        .is("deleted_at", null)
        .eq("direction", "expense");

      // Fetch Previous Range (if not ALL)
      let prevTx: Transaction[] = [];
      if (range !== "ALL") {
        const { data } = await supabase
          .from("transactions")
          .select("*")
          .gte("occurred_at", prevStart.toISOString())
          .lt("occurred_at", prevEnd.toISOString())
          .is("deleted_at", null)
          .eq("direction", "expense");
        prevTx = data || [];
      }

      // Process Data
      const currentExpenses = currentTx || [];
      const currentTotal = currentExpenses.reduce(
        (acc, t) => acc + t.amount,
        0
      );
      const prevTotal = prevTx.reduce((acc, t) => acc + t.amount, 0);

      // Grouping
      let chartData: ChartDataPoint[] = [];
      if (groupBy === "day") {
        const interval = eachDayOfInterval({ start, end });
        const prevInterval =
          range !== "ALL"
            ? eachDayOfInterval({ start: prevStart, end: prevEnd })
            : [];

        chartData = interval.map((date, i) => {
          const dayStr = format(date, "yyyy-MM-dd");
          const curAmt = currentExpenses
            .filter((t) => t.occurred_at.startsWith(dayStr))
            .reduce((acc, t) => acc + t.amount, 0);

          let prevAmt = 0;
          if (prevInterval[i]) {
            const prevDate = prevInterval[i];
            const prevDayStr = format(prevDate, "yyyy-MM-dd");
            prevAmt = prevTx
              .filter((t) => t.occurred_at.startsWith(prevDayStr))
              .reduce((acc, t) => acc + t.amount, 0);
          }

          return {
            label: format(date, range === "1W" ? "EEE" : "d"),
            current: curAmt,
            previous: range === "ALL" ? 0 : prevAmt,
            date: date.toISOString(),
          };
        });
      } else {
        // Monthly grouping
        const interval = eachMonthOfInterval({ start, end });
        const prevInterval =
          range !== "ALL"
            ? eachMonthOfInterval({ start: prevStart, end: prevEnd })
            : [];

        chartData = interval.map((date, i) => {
          const monthStr = format(date, "yyyy-MM");
          const curAmt = currentExpenses
            .filter((t) => t.occurred_at.startsWith(monthStr))
            .reduce((acc, t) => acc + t.amount, 0);

          let prevAmt = 0;
          if (prevInterval[i]) {
            const prevMonthStr = format(prevInterval[i], "yyyy-MM");
            prevAmt = prevTx
              .filter((t) => t.occurred_at.startsWith(prevMonthStr))
              .reduce((acc, t) => acc + t.amount, 0);
          }

          return {
            label: format(date, "MMM"),
            current: curAmt,
            previous: range === "ALL" ? 0 : prevAmt,
            date: date.toISOString(),
          };
        });
      }

      const absoluteChange = currentTotal - prevTotal;
      const percentChange =
        prevTotal > 0 ? (absoluteChange / prevTotal) * 100 : 0;

      setData({
        current: currentTotal,
        previous: prevTotal,
        combinedData: chartData,
        isIncrease: absoluteChange > 0,
        absoluteChange,
        percentChange,
      });
      setIsLoading(false);
    };

    fetchData();
  }, [range, selectedDate]); // Re-fetch when range or selected date changes

  if (!data && isLoading)
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        Loading chart...
      </div>
    );
  if (!data) return null;

  const ranges: TimeRange[] = ["1W", "1M", "3M", "6M", "1Y", "3Y", "ALL"];

  return (
    <div className="w-full space-y-4">
      {/* Chart Container */}
      <div className="bg-white/50 rounded-3xl p-4 backdrop-blur-sm">
        {/* HeaderStats */}
        <div className="flex items-center justify-between mb-4 px-2">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Total Spending
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatAmount(data.current)}
            </p>
            {range !== "ALL" && (
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "text-xs font-medium px-1.5 py-0.5 rounded",
                    data.isIncrease
                      ? "bg-red-100 text-red-600"
                      : "bg-green-100 text-green-600"
                  )}
                >
                  {data.isIncrease ? "+" : ""}
                  {data.percentChange.toFixed(1)}%
                </span>
                <span className="text-xs text-gray-400">
                  vs previous {range}
                </span>
              </div>
            )}
          </div>

          {/* Range Selector - Stocks Style (Pills) */}
          {/* We can put it here or below. Stocks usually puts it at bottom. */}
        </div>

        {/* Legend */}
        {range !== "ALL" && (
          <div className="flex items-center justify-center gap-6 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-[#007AFF] rounded-full" />
              <span className="text-xs text-gray-600">Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-0.5 bg-gray-300 rounded-full"
                style={{ borderStyle: "dashed" }}
              />
              <span className="text-xs text-gray-400">Previous</span>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data.combinedData}
              margin={{ bottom: 5, left: -15, right: 5 }}
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#007AFF" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#007AFF" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                interval={
                  range === "1W" ? 0 : range === "1M" ? 4 : "preserveStartEnd"
                }
                dy={5}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fill: "#D1D5DB" }}
                tickFormatter={(v) =>
                  v > 0 ? `${(v / 1000).toFixed(0)}k` : "0"
                }
                domain={[0, "auto"]}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(8px)",
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [formatAmount(value), "Spending"]}
                labelStyle={{ color: "#6B7280", marginBottom: "4px" }}
              />
              {/* Previous comparison line (dotted/gray) */}
              {range !== "ALL" && (
                <Area
                  type="monotoneX"
                  dataKey="previous"
                  stroke="#D1D5DB"
                  strokeWidth={1.5}
                  fill="transparent"
                  strokeDasharray="4 4"
                  isAnimationActive={false}
                  baseValue={0}
                />
              )}
              <Area
                type="monotoneX"
                dataKey="current"
                stroke="#007AFF"
                strokeWidth={2}
                fill="url(#chartGradient)"
                activeDot={{ r: 4, strokeWidth: 0 }}
                baseValue={0}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Range Selector */}
        <div className="flex justify-between items-center mt-6 px-1">
          {ranges.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "text-[11px] font-semibold py-1 px-2.5 rounded-full transition-all duration-200",
                range === r
                  ? "bg-gray-900 text-white shadow-md scale-105"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
