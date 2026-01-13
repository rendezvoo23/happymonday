import { getIconComponent } from "@/components/icons";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";

interface CategorySpend {
  categoryId: string;
  label: string;
  color: string;
  amount: number;
  subcategories: {
    id: string;
    label: string;
    amount: number;
    icon?: string;
  }[];
}

interface CategoryDoughnutChartProps {
  spendByCategory: CategorySpend[];
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="outline-none focus:outline-none"
        style={{
          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))",
          transition: "all 0.3s ease-out",
        }}
      />
    </g>
  );
};

export function CategoryDoughnutChart({
  spendByCategory,
}: CategoryDoughnutChartProps) {
  const { formatAmount } = useCurrency();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Sort by amount descending
  const sortedCategories = useMemo(() => {
    return [...spendByCategory].sort((a, b) => b.amount - a.amount);
  }, [spendByCategory]);

  const activeIndex = useMemo(() => {
    return sortedCategories.findIndex((cat) => cat.categoryId === expandedId);
  }, [expandedId, sortedCategories]);

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

  const onPieClick = (_: any, index: number) => {
    const cat = sortedCategories[index];
    if (cat) {
      toggleExpand(cat.categoryId);
    }
  };

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
    <div className="w-full">
      <div className="bg-white/50 backdrop-blur-sm rounded-3xl p-4">
        {/* Doughnut Chart */}
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart className="outline-none focus:outline-none">
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
                onClick={onPieClick}
                className="outline-none focus:outline-none cursor-pointer"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`${entry.name}-${entry.color}`}
                    fill={entry.color}
                    className="outline-none focus:outline-none"
                    style={{
                      opacity:
                        activeIndex === -1 || activeIndex === index ? 1 : 0.6,
                      transition: "opacity 0.3s ease",
                    }}
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
              <div
                key={cat.categoryId}
                className={cn(
                  "flex flex-col transition-all duration-300 rounded-2xl",
                  expandedId === cat.categoryId
                    ? "bg-gray-50 dark:bg-gray-800/40 px-3 -mx-3"
                    : "px-0 -mx-0"
                )}
              >
                <button
                  type="button"
                  onClick={() =>
                    cat.subcategories.length > 0 && toggleExpand(cat.categoryId)
                  }
                  className="flex items-center gap-3 w-full py-2.5"
                >
                  {/* Color Dot Container for alignment */}
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                  </div>

                  {/* Category Name */}
                  <span className="flex-1 font-medium text-gray-800 truncate text-left">
                    {cat.label}
                  </span>

                  {/* Amount and Percentage */}
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {formatAmount(cat.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                    {/* Chevron or spacer for alignment */}
                    <div className="w-4 h-4 text-gray-400 flex items-center justify-center">
                      {cat.subcategories.length > 0 &&
                        (expandedId === cat.categoryId ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        ))}
                    </div>
                  </div>
                </button>

                {/* Subcategories Expansion */}
                <AnimatePresence>
                  {expandedId === cat.categoryId &&
                    cat.subcategories.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="py-2 space-y-2">
                          {cat.subcategories
                            .sort((a, b) => b.amount - a.amount)
                            .map((sub) => {
                              const SubIcon = getIconComponent(sub.icon);
                              return (
                                <div
                                  key={sub.id}
                                  className="flex items-center gap-3 text-sm"
                                >
                                  {/* Subcategory Icon */}
                                  <div
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
                                    style={{ backgroundColor: cat.color }}
                                  >
                                    {SubIcon ? (
                                      <div className="transform scale-[0.6]">
                                        {SubIcon}
                                      </div>
                                    ) : (
                                      <span className="text-[9px] font-bold">
                                        {sub.label[0]}
                                      </span>
                                    )}
                                  </div>

                                  <span className="flex-1 text-gray-600 truncate">
                                    {sub.label}
                                  </span>
                                  <span className="font-medium text-gray-900 pr-6">
                                    {formatAmount(sub.amount)}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </motion.div>
                    )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
