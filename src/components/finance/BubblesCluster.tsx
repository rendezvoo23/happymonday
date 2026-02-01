import { useCategoryLabel } from "@/hooks/useCategoryLabel";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslation } from "@/hooks/useTranslation";
import { getCategoryColor, useCategoryStore } from "@/stores/categoryStore";
import type { Tables } from "@/types/supabase";
import { packCircles } from "@/utils/circlePacking";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { getIconComponent } from "../icons";

type Transaction = Tables<"transactions">;

interface TransactionWithCategory extends Transaction {
  categories: Pick<
    Tables<"categories">,
    "id" | "name" | "color" | "icon"
  > | null;
  subcategories: Pick<Tables<"subcategories">, "id" | "name" | "icon"> | null;
}

interface BubblesClusterProps {
  transactions: TransactionWithCategory[];
  mode?: "cluster" | "blurred";
  height?: number;
  onBubbleClick?: (categoryId: string) => void;
  animateBubbles?: boolean;
  useGooeyFilter?: boolean;
}

export function BubblesCluster({
  transactions,
  mode = "cluster",
  height = 380,
  onBubbleClick,
  animateBubbles = true,
  useGooeyFilter = false,
}: BubblesClusterProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { getCategoryById } = useCategoryStore();
  const { formatCompactAmount } = useCurrency();
  const { t } = useTranslation();
  const { getCategoryLabel } = useCategoryLabel();

  const totalExpensesAmount = useMemo(
    () =>
      transactions
        .filter((t) => t.direction === "expense")
        .reduce((acc, t) => acc + t.amount, 0),
    [transactions]
  );

  // Helper to convert hex color to rgba with transparency
  // const hexToRgba = (hex: string, alpha: number) => {
  //   const r = Number.parseInt(hex.slice(1, 3), 16);
  //   const g = Number.parseInt(hex.slice(3, 5), 16);
  //   const b = Number.parseInt(hex.slice(5, 7), 16);
  //   return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  // };

  // Measure container size
  useEffect(() => {
    if (!containerRef.current) return;

    // Initial measurement
    const rect = containerRef.current.getBoundingClientRect();
    setDimensions({
      width: rect.width,
      height: rect.height,
    });

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Aggregate expenses by category
  const bubbles = useMemo(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return [];

    const expenses = transactions.filter((t) => t.direction === "expense");
    const total = expenses.reduce((acc, t) => acc + t.amount, 0);

    // Aggregate by category and track subcategories
    const aggregated = expenses.reduce(
      (acc, t) => {
        const catId = t.category_id || "uncategorized";
        if (!acc[catId]) {
          acc[catId] = { total: 0, subcategories: {} };
        }
        acc[catId].total += t.amount;

        // Track subcategory spending
        if (t.subcategory_id) {
          if (!acc[catId].subcategories[t.subcategory_id]) {
            acc[catId].subcategories[t.subcategory_id] = {
              amount: 0,
              icon: t.subcategories?.icon || null,
              name: t.subcategories?.name || null,
            };
          }
          acc[catId].subcategories[t.subcategory_id].amount += t.amount;
        }
        return acc;
      },
      {} as Record<
        string,
        {
          total: number;
          subcategories: Record<
            string,
            { amount: number; icon: string | null; name: string | null }
          >;
        }
      >
    );

    const data = Object.entries(aggregated)
      .map(([catId, data]) => {
        // Try to get category from the transaction's joined data or store
        const txWithCat = transactions.find((t) => t.category_id === catId);
        const category = txWithCat?.categories || getCategoryById(catId);

        // Find the top spending subcategory
        const topSubcategory = Object.entries(data.subcategories).sort(
          (a, b) => b[1].amount - a[1].amount
        )[0];

        return {
          id: catId,
          value: data.total,
          category: category
            ? {
                id: catId,
                color: getCategoryColor(category.color, category.name),
                label: category.name || "Unknown",
                icon: category.icon,
              }
            : { id: catId, color: "#8E8E93", label: "Unknown", icon: null },
          topSubcategory: topSubcategory
            ? {
                icon: topSubcategory[1].icon,
                name: topSubcategory[1].name,
                amount: topSubcategory[1].amount,
              }
            : null,
          percentage: total > 0 ? data.total / total : 0,
        };
      })
      .sort((a, b) => b.value - a.value);

    // Use circle packing
    const packed = packCircles(
      data.map((d) => ({ id: d.id, value: d.value })),
      {
        minRadius: mode === "cluster" ? 24 : 60,
        maxRadius: mode === "cluster" ? 120 : 100,
        padding: mode === "cluster" ? 1 : 10,
      }
    );

    // Calculate bounding box of the packed circles
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    if (packed.length > 0) {
      packed.forEach((p) => {
        minX = Math.min(minX, p.x - p.r);
        maxX = Math.max(maxX, p.x + p.r);
        minY = Math.min(minY, p.y - p.r);
        maxY = Math.max(maxY, p.y + p.r);
      });
    } else {
      minX = 0;
      maxX = 0;
      minY = 0;
      maxY = 0;
    }

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const padding = 10;
    const containerWidth = dimensions.width - padding * 2;
    const containerHeight = dimensions.height - padding * 2;

    const scaleX = contentWidth > 0 ? containerWidth / contentWidth : 1;
    const scaleY = contentHeight > 0 ? containerHeight / contentHeight : 1;
    const scale = Math.min(scaleX, scaleY, 1) * 0.95;

    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;

    return data.map((item) => {
      const layout = packed.find((p) => p.id === item.id);
      if (!layout) {
        // Fallback if layout not found (shouldn't happen, but TypeScript safety)
        return {
          ...item,
          x: 0,
          y: 0,
          r: 0,
        };
      }
      return {
        ...item,
        x: (layout.x - contentCenterX) * scale,
        y: (layout.y - contentCenterY) * scale,
        r: layout.r * scale,
      };
    });
  }, [transactions, mode, dimensions, getCategoryById]);

  if (transactions.filter((t) => t.direction === "expense").length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-400 text-sm"
        style={{ height }}
      >
        {t("statistics.noData")}
      </div>
    );
  }

  const handleBubbleClick = (categoryId: string) => {
    if (onBubbleClick && mode === "blurred") {
      onBubbleClick(categoryId);
    } else if (mode === "cluster") {
      navigate({ to: "/statistics", search: { category: categoryId } });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full flex items-center justify-center p-4"
      style={{ height }}
    >
      {/* Gooey Filter - Only for cluster mode */}
      {mode === "cluster" && useGooeyFilter && (
        <svg
          style={{ position: "absolute", width: 0, height: 0 }}
          aria-hidden="true"
        >
          <defs>
            <filter id="goo">
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="12"
                result="blur"
                colorInterpolationFilters="sRGB"
              />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -6"
                result="goo"
                colorInterpolationFilters="sRGB"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
            </filter>
          </defs>
        </svg>
      )}

      <motion.div
        key={`${mode}-${totalExpensesAmount}`}
        className="relative w-full h-full"
        // style={{
        //   filter: mode === "cluster" ? "url(#goo)" : "blur(70px)",
        // }}
        initial={
          mode === "blurred" ? { filter: "blur(60px)", opacity: 0 } : false
        }
        animate={
          mode === "blurred" ? { filter: "blur(80px)", opacity: 1 } : false
        }
        transition={{ duration: 1 }}
      >
        {bubbles.map((bubble) => {
          // Disable complex CSS filters inside the SVG filter for better compatibility
          const bubbleEffects =
            mode === "cluster"
              ? "" // Gooey mode handles the look
              : "shadow-lg backdrop-blur-md"; // Blurred mode gets shadows/blur

          // In blurred mode, hide bubbles without color (uncategorized)
          const shouldHide =
            mode === "blurred" && bubble.category.color === "#8E8E93";
          if (shouldHide) return null;

          return (
            <motion.div
              key={bubble.id}
              layout={animateBubbles}
              initial={animateBubbles ? { scale: 0, opacity: 0 } : false}
              animate={
                animateBubbles
                  ? {
                      scale: 1,
                      opacity: 1,
                      x: bubble.x,
                      y: [bubble.y - 3, bubble.y + 3, bubble.y - 3],
                    }
                  : {
                      scale: 1,
                      opacity: 1,
                      x: bubble.x,
                      y: bubble.y,
                    }
              }
              whileTap={animateBubbles ? { scale: 0.9 } : undefined}
              transition={
                animateBubbles
                  ? {
                      scale: { type: "spring", stiffness: 300, damping: 20 },
                      opacity: { duration: 0.2 },
                      y: {
                        duration: 2 + Math.random() * 2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                      },
                      layout: { type: "spring", stiffness: 200, damping: 25 },
                    }
                  : { duration: 0 }
              }
              onClick={() => {
                if (window.Telegram?.WebApp?.HapticFeedback) {
                  window.Telegram.WebApp.HapticFeedback.impactOccurred("heavy");
                }
                handleBubbleClick(bubble.id);
              }}
              className={`absolute flex flex-col items-center justify-center rounded-full ${bubbleEffects} ${mode === "cluster" || (mode === "blurred" && onBubbleClick) ? "cursor-pointer" : ""}`}
              style={{
                width: bubble.r * 2,
                height: bubble.r * 2,
                // background: `radial-gradient(circle, ${hexToRgba(bubble.category.color, 0.95)} 0%, ${hexToRgba(bubble.category.color, 0.85)} 40%, ${hexToRgba(bubble.category.color, 1)} 70%, ${hexToRgba(bubble.category.color, 1)} 70%, transparent 100%)`,
                background: bubble.category.color,
                opacity: 1,
                zIndex: 10,
                left: "50%",
                top: "50%",
                marginLeft: -bubble.r,
                marginTop: -bubble.r,
              }}
            >
              {bubble.r > 30 && mode !== "blurred" && (
                <span
                  className="text-white/90 font-medium mt-0 text-center leading-tight"
                  style={{
                    fontSize: Math.max(8, bubble.r * 0.2),
                    opacity: 0.85,
                  }}
                >
                  {bubble.topSubcategory?.icon
                    ? getIconComponent(bubble.topSubcategory.icon, {
                        width: bubble.r > 50 ? 40 : 20,
                        height: bubble.r > 50 ? 40 : 20,
                      })
                    : mapIconToLabel(
                        getCategoryLabel(bubble.category.label),
                        bubble.r > 50 ? "large" : "medium"
                      )}
                </span>
              )}
              {mode !== "blurred" && (
                <span
                  className="text-white font-bold text-lg text-center leading-tight mt-1"
                  style={{
                    fontSize: Math.max(10, bubble.r * 0.3),
                    opacity: 1,
                  }}
                >
                  {formatCompactAmount(bubble.value)}
                </span>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

function mapIconToLabel(
  label: string,
  variant: "small" | "medium" | "large" = "medium"
) {
  const sizeMap = {
    small: 10,
    medium: 20,
    large: 40,
  };
  const size = sizeMap[variant] || 20;
  switch (label.toLowerCase()) {
    case "food & drink":
      return getIconComponent(":fork:", { width: size, height: size });
    case "transport":
      return getIconComponent(":car:", { width: size, height: size });
    case "health":
      return getIconComponent(":leaf:", { width: size, height: size });
    case "entertainment":
      return getIconComponent(":film:", { width: size, height: size });
    case "shopping":
      return getIconComponent(":lamp:", { width: size, height: size });
    case "services":
      return getIconComponent(":bolt:", { width: size, height: size });
    case "travel":
      return getIconComponent(":plane:", { width: size, height: size });
    case "other":
      return getIconComponent(":more:", { width: size, height: size });
    default:
      return label;
  }
}
