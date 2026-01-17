import { useCurrency } from "@/hooks/useCurrency";
import { getCategoryColor, useCategoryStore } from "@/stores/categoryStore";
import type { Tables } from "@/types/supabase";
import { packCircles } from "@/utils/circlePacking";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

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
}

export function BubblesCluster({
  transactions,
  mode = "cluster",
  height = 320,
  onBubbleClick,
}: BubblesClusterProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { getCategoryById } = useCategoryStore();
  const { formatCompactAmount } = useCurrency();

  // Helper to convert hex color to rgba with transparency
  const hexToRgba = (hex: string, alpha: number) => {
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

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
        minRadius: mode === "cluster" ? 40 : 60,
        maxRadius: mode === "cluster" ? 70 : 100,
        padding: mode === "cluster" ? -15 : 10,
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
      className="relative w-full flex items-center justify-center overflow-hidden"
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
                stdDeviation="15"
                result="blur"
                colorInterpolationFilters="sRGB"
              />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                result="goo"
                colorInterpolationFilters="sRGB"
              />
              <feComposite in="SourceGraphic" in2="goo" operator="atop" />
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
              layout
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
                x: bubble.x,
                y: [bubble.y - 2, bubble.y + 2, bubble.y - 2],
              }}
              whileTap={{ scale: 0.9 }}
              transition={{
                scale: { type: "spring", stiffness: 300, damping: 20 },
                opacity: { duration: 0.2 },
                y: {
                  duration: 2 + Math.random() * 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                },
                layout: { type: "spring", stiffness: 200, damping: 25 },
              }}
              onClick={() => {
                if (window.Telegram?.WebApp?.HapticFeedback) {
                  window.Telegram.WebApp.HapticFeedback.impactOccurred("heavy");
                }
                handleBubbleClick(bubble.id);
              }}
              className={`absolute flex flex-col items-center justify-center rounded-full ${bubbleEffects} ${mode === "cluster" || (mode === "separated" && onBubbleClick) ? "cursor-pointer" : ""}`}
              style={{
                width: bubble.r * 2,
                height: bubble.r * 2,
                background: `radial-gradient(circle, ${bubble.category.color} 0%, ${hexToRgba(bubble.category.color, 0.8)} 95%, transparent 100%)`,
                opacity: 1,
                zIndex: 10,
                left: "50%",
                top: "50%",
                marginLeft: -bubble.r,
                marginTop: -bubble.r,
              }}
            >
              <span
                className="text-white font-bold text-lg text-center leading-tight"
                style={{ fontSize: Math.max(10, bubble.r * 0.3) }}
              >
                {formatCompactAmount(bubble.value)}
              </span>
              {bubble.r > 30 && (
                <span
                  className="text-white/90 font-medium mt-0 text-center leading-tight"
                  style={{
                    fontSize: Math.max(8, bubble.r * 0.2),
                    opacity: 0.5,
                  }}
                >
                  {bubble.category.label}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
