import { useCurrency } from "@/hooks/useCurrency";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface CategorySpend {
  categoryId: string;
  label: string;
  color: string;
  amount: number;
}

interface CategoryDoughnutChartProps {
  spendByCategory: CategorySpend[];
}

export function CategoryDoughnutChart({
  spendByCategory,
}: CategoryDoughnutChartProps) {
  const { formatAmount } = useCurrency();
  // Sort by amount descending
  const sortedCategories = useMemo(() => {
    return [...spendByCategory].sort((a, b) => b.amount - a.amount);
  }, [spendByCategory]);

  // Total expenses
  const totalExpenses = useMemo(() => {
    return sortedCategories.reduce((acc, cat) => acc + cat.amount, 0);
  }, [sortedCategories]);

  // Chart data
  const chartData = useMemo(() => {
    return sortedCategories.map((cat) => ({
      name: cat.label,
      value: cat.amount,
      color: cat.color,
    }));
  }, [sortedCategories]);

  if (sortedCategories.length === 0) {
    return (
      <div className="w-full px-4">
        <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-6 text-center">
          <p className="text-gray-400">No expenses this month</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4">
      <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-4">
        {/* Doughnut Chart */}
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`${entry.name}-${entry.color}`}
                    fill={entry.color}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
              Total
            </p>
            <p className="text-xl font-bold text-gray-900 text-center leading-tight break-words max-w-full">
              {formatAmount(totalExpenses)}
            </p>
          </div>
        </div>

        {/* Category Breakdown List */}
        <div className="mt-4 pt-4 border-t border-gray-200/50 space-y-3">
          {sortedCategories.map((cat) => {
            const percentage =
              totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0;
            return (
              <div key={cat.categoryId} className="flex items-center gap-3">
                {/* Color Dot */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />

                {/* Category Name */}
                <span className="flex-1 font-medium text-gray-800 truncate">
                  {cat.label}
                </span>
                {/* Amount and Percentage */}
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatAmount(cat.amount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
