import { useCurrency } from "@/hooks/useCurrency";
import { getCategoryColor, useCategoryStore } from "@/stores/categoryStore";
import type { Tables } from "@/types/supabase";
import { packCircles } from "@/utils/circlePacking";
import { motion } from "framer-motion";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getIconComponent } from "../icons";

type Transaction = Tables<"transactions">;

interface TransactionWithCategory extends Transaction {
  categories: Pick<
    Tables<"categories">,
    "id" | "name" | "color" | "icon"
  > | null;
}

interface BubblesClusterProps {
  transactions: TransactionWithCategory[];
  mode?: "cluster" | "separated";
  height?: number;
  onBubbleClick?: (categoryId: string) => void;
  animateBubbles?: boolean;
  isLoading?: boolean;
}

export function BubblesCluster({
  transactions,
  mode = "cluster",
  height = 320,
  onBubbleClick,
  animateBubbles = true,
  isLoading = false,
}: BubblesClusterProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 400,
    height: height,
  });
  const { getCategoryById } = useCategoryStore();
  const { formatCompactAmount } = useCurrency();

  // Measure container size
  useLayoutEffect(() => {
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

    const aggregated = expenses.reduce(
      (acc, t) => {
        const catId = t.category_id || "uncategorized";
        acc[catId] = (acc[catId] || 0) + t.amount;
        return acc;
      },
      {} as Record<string, number>
    );

    const data = Object.entries(aggregated)
      .map(([catId, amount]) => {
        // Try to get category from the transaction's joined data or store
        const txWithCat = transactions.find((t) => t.category_id === catId);
        const category = txWithCat?.categories || getCategoryById(catId);
        return {
          id: catId,
          value: amount,
          category: category
            ? {
                color: getCategoryColor(category.color, category.name),
                label: category.name || "Unknown",
              }
            : { color: "#8E8E93", label: "Unknown" },
          percentage: total > 0 ? amount / total : 0,
        };
      })
      .sort((a, b) => b.value - a.value);

    // Use circle packing
    const packed = packCircles(
      data.map((d) => ({ id: d.id, value: d.value })),
      {
        minRadius: mode === "cluster" ? 30 : 60,
        maxRadius: mode === "cluster" ? 120 : 100,
        padding: mode === "cluster" ? -20 : 10,
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

    const padding = 20;
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
    if (isLoading) {
      return (
        <div className="flex items-center justify-center" style={{ height }} />
      );
    }
    return (
      <div
        className="flex items-center justify-center text-gray-400 text-sm"
        style={{ height }}
      >
        No expenses yet
      </div>
    );
  }

  const handleBubbleClick = (categoryId: string) => {
    if (onBubbleClick && mode === "separated") {
      onBubbleClick(categoryId);
    } else if (mode === "cluster") {
      navigate(`/statistics?category=${categoryId}`);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full flex items-center justify-center"
      style={{ height }}
    >
      {/* Gooey Filter - Only for cluster mode */}
      {mode === "cluster" && (
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
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
                result="goo"
                colorInterpolationFilters="sRGB"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="over" />
            </filter>
          </defs>
        </svg>
      )}

      <div
        className="relative w-full h-full"
        style={{
          filter: mode === "cluster" ? "url(#goo)" : "none",
          // WebKit sometimes needs this to force hardware acceleration for filters
          transform: "translate3d(0,0,0)",
        }}
      >
        {bubbles.map((bubble) => {
          // Disable complex CSS filters inside the SVG filter for better compatibility
          const bubbleEffects =
            mode === "cluster"
              ? "" // Gooey mode handles the look
              : "shadow-lg backdrop-blur-md"; // Separated mode gets shadows/blur

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
                      y: [bubble.y - 2, bubble.y + 2, bubble.y - 2],
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
              className={`absolute glassmorphic-circle-wrap ${bubbleEffects} ${
                mode === "cluster" || (mode === "separated" && onBubbleClick)
                  ? "cursor-pointer"
                  : ""
              }`}
              style={
                {
                  width: bubble.r * 2,
                  height: bubble.r * 2,
                  zIndex: 10,
                  left: "50%",
                  top: "50%",
                  marginLeft: -bubble.r,
                  marginTop: -bubble.r,
                  "--circle-color": bubble.category.color,
                } as React.CSSProperties
              }
            >
              <div className="glassmorphic-circle-shadow" />
              <div className="glassmorphic-circle-btn">
                {bubble.r > 30 && (
                  <span
                    className="circle-icon text-white/90 font-medium text-center leading-tight mb-1"
                    style={{
                      fontSize: Math.max(8, bubble.r * 0.2),
                    }}
                  >
                    {mapIconToLabel(
                      bubble.category.label,
                      bubble.r > 50 ? "large" : "medium"
                    )}
                  </span>
                )}
                <span
                  className="text-white font-bold text-center leading-tight mt-1"
                  style={{
                    fontSize: Math.max(10, bubble.r * 0.3),
                  }}
                >
                  {formatCompactAmount(bubble.value)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
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
    default:
      return label;
  }
}
