import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
} from "recharts";

interface CategorySpend {
  categoryId: string;
  label: string;
  color: string;
  amount: number;
}

interface AnalyticsWidgetsProps {
  spendByCategory: CategorySpend[];
  chartData: { current: number; previous: number }[]; // Data for the sparkline
  percentChange?: number;
  isIncrease?: boolean;
  onDoughnutClick: () => void;
  onChartClick: () => void;
  currentMonthName: string;
  prevMonthName: string;
}

export function AnalyticsWidgets({
  spendByCategory,
  chartData,
  percentChange,
  isIncrease,
  onDoughnutClick,
  onChartClick,
  currentMonthName,
  prevMonthName,
}: AnalyticsWidgetsProps) {
  const { formatAmount } = useCurrency();

  const totalExpenses = spendByCategory.reduce(
    (acc, cat) => acc + cat.amount,
    0
  );

  return (
    <div className="grid grid-cols-2 gap-4 w-full px-4">
      {/* Doughnut Widget */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onDoughnutClick}
        className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center justify-center h-40"
      >
        <div className="w-full h-24">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={spendByCategory}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={35}
                paddingAngle={2}
                dataKey="amount"
                strokeWidth={0}
              >
                {spendByCategory.map((entry) => (
                  <Cell key={entry.categoryId} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-center">
          <p className="text-xs font-semibold text-gray-900">
            {formatAmount(totalExpenses)}
          </p>
        </div>
      </motion.button>

      {/* Interval Chart Widget */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onChartClick}
        className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col h-40"
      >
        <div className="w-full h-20 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <defs>
                <linearGradient id="widgetGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#007AFF" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#007AFF" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area
                type="monotoneX"
                dataKey="previous"
                stroke="#D1D5DB"
                strokeWidth={1.5}
                fill="transparent"
                strokeDasharray="4 4"
                isAnimationActive={false}
              />
              <Area
                type="monotoneX"
                dataKey="current"
                stroke="#007AFF"
                strokeWidth={2}
                fill="url(#widgetGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-200" />
            <span className="text-[10px] text-gray-400">{prevMonthName}</span>
          </div>
          {percentChange !== undefined && (
            <span
              className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                isIncrease
                  ? "bg-red-50 text-red-500"
                  : "bg-green-50 text-green-500"
              )}
            >
              {isIncrease ? "+" : ""}
              {percentChange.toFixed(0)}%
            </span>
          )}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400">
              {currentMonthName}
            </span>
            <div className="w-2 h-2 rounded-full bg-[#007AFF]" />
          </div>
        </div>
      </motion.button>
    </div>
  );
}
