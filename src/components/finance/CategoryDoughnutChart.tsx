import { getIconComponent } from "@/components/icons";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  initialExpandedCategory?: string | null;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="outline-none focus:outline-none"
        style={{
          filter: `drop-shadow(0 8px 16px ${fill}44)`,
          transition: "all 0.4s var(--apple-easing)",
        }}
      />
    </g>
  );
};

export function CategoryDoughnutChart({
  spendByCategory,
  initialExpandedCategory,
}: CategoryDoughnutChartProps) {
  const { formatAmount, formatCompactAmount } = useCurrency();
  const [expandedId, setExpandedId] = useState<string | null>(
    initialExpandedCategory || null
  );
  const { t } = useTranslation();

  // Create refs for category elements to support auto-scrolling
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Sort by amount descending - must be before useEffect that uses it
  const sortedCategories = useMemo(() => {
    return [...spendByCategory].sort((a, b) => b.amount - a.amount);
  }, [spendByCategory]);

  // Auto-expand and scroll to category on mount if initialExpandedCategory is provided
  useEffect(() => {
    if (initialExpandedCategory && sortedCategories.length > 0) {
      // Check if the category exists in the sorted categories
      const categoryExists = sortedCategories.some(
        (cat) => cat.categoryId === initialExpandedCategory
      );

      if (categoryExists) {
        setExpandedId(initialExpandedCategory);

        // // Scroll to the category after a delay to allow rendering
        // setTimeout(() => {
        //   categoryRefs.current[initialExpandedCategory]?.scrollIntoView({
        //     behavior: "smooth",
        //     block: "center",
        //   });
        // }, 500);
      }
    }
  }, [initialExpandedCategory, sortedCategories]);

  const toggleExpand = (id: string | null) => {
    setExpandedId(expandedId === id ? null : id);

    // // Auto-scroll to selected category after a short delay for animation
    // if (id) {
    //   setTimeout(() => {
    //     categoryRefs.current[id]?.scrollIntoView({
    //       behavior: "smooth",
    //       block: "nearest",
    //     });
    //   }, 100);
    // }
  };

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

  const onPieClick = (_: unknown, index: number) => {
    const cat = sortedCategories[index];
    if (cat) {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.selectionChanged();
      }
      toggleExpand(cat.categoryId);
    }
  };

  if (sortedCategories.length === 0) {
    return (
      <div className="w-full">
        <div className="p-6 text-center mx-4 min-h-64 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">
            {t("statistics.noData")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="card-level-1 rounded-[2rem] p-4 transition-all duration-300">
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
                        activeIndex === -1 || activeIndex === index ? 1 : 0.9,
                      transition: "opacity 0.3s ease",
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center leading-tight break-words max-w-full">
              {formatCompactAmount(totalExpenses)}
            </p>
          </div>
        </div>

        <div className="inset-0 flex flex-col items-center justify-center pointer-events-none px-4">
          <p className="text-[16px] uppercase tracking-wider text-center">
            <span className="opacity-50 text-[12px]">
              {t("statistics.totalExpenses")}
            </span>
            <br />
            <b>{formatAmount(totalExpenses)}</b>
          </p>
        </div>

        {/* Category Breakdown List */}
        <div className="mt-4 pt-4 border-t border-border-subtle space-y-3">
          {sortedCategories.map((cat) => {
            const percentage =
              totalExpenses > 0 ? (cat.amount / totalExpenses) * 100 : 0;
            return (
              <div
                key={cat.categoryId}
                ref={(el) => {
                  categoryRefs.current[cat.categoryId] = el;
                }}
                className={cn(
                  "flex flex-col transition-all duration-300 rounded-2xl",
                  expandedId === cat.categoryId ? "px-3 -mx-3" : "px-0 -mx-0"
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (window.Telegram?.WebApp?.HapticFeedback) {
                      window.Telegram.WebApp.HapticFeedback.selectionChanged();
                    }
                    toggleExpand(cat.categoryId);
                  }}
                  className="flex items-center gap-3 w-full py-2.5 outline-none"
                >
                  <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                  </div>

                  <span className="flex-1 font-medium text-gray-800 dark:text-gray-200 truncate text-left">
                    {cat.label}
                  </span>

                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                        {formatAmount(cat.amount)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                    <div className="w-4 h-4 text-gray-400 dark:text-gray-500 flex items-center justify-center">
                      {cat.subcategories.length > 0 &&
                        (expandedId === cat.categoryId ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        ))}
                    </div>
                  </div>
                </button>

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

                                  <span className="flex-1 text-gray-600 dark:text-gray-400 truncate">
                                    {sub.label}
                                  </span>
                                  <span className="font-medium text-gray-900 dark:text-gray-100 pr-6">
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
