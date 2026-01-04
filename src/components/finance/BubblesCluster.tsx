import { useMemo, useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Transaction } from "@/types";
import { getCategoryById } from "@/config/categories";
import { packCircles } from "@/utils/circlePacking";

interface BubblesClusterProps {
    transactions: Transaction[];
    mode?: 'cluster' | 'separated';
    height?: number;
    onBubbleClick?: (categoryId: string) => void;
}

export function BubblesCluster({ transactions, mode = 'cluster', height = 320, onBubbleClick }: BubblesClusterProps) {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Measure container size
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Aggregate expenses by category
    const bubbles = useMemo(() => {
        if (dimensions.width === 0 || dimensions.height === 0) return [];

        const expenses = transactions.filter(t => t.type === 'expense');
        const total = expenses.reduce((acc, t) => acc + t.amount, 0);

        const aggregated = expenses.reduce((acc, t) => {
            acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

        const data = Object.entries(aggregated)
            .map(([catId, amount]) => ({
                id: catId,
                value: amount,
                category: getCategoryById(catId as any),
                percentage: total > 0 ? amount / total : 0
            }))
            .sort((a, b) => b.value - a.value);

        // Use circle packing
        // mode 'cluster': tighter packing, smaller bubbles for home
        // mode 'separated': looser packing, larger bubbles for stats
        const packed = packCircles(
            data.map(d => ({ id: d.id, value: d.value })),
            {
                minRadius: mode === 'cluster' ? 40 : 60,
                maxRadius: mode === 'cluster' ? 70 : 100,
                padding: mode === 'cluster' ? -15 : 10 // Negative padding for overlap/gooey effect
            }
        );

        // Calculate bounding box of the packed circles
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        if (packed.length > 0) {
            packed.forEach(p => {
                minX = Math.min(minX, p.x - p.r);
                maxX = Math.max(maxX, p.x + p.r);
                minY = Math.min(minY, p.y - p.r);
                maxY = Math.max(maxY, p.y + p.r);
            });
        } else {
            minX = 0; maxX = 0; minY = 0; maxY = 0;
        }

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;

        // Container dimensions with padding
        const padding = 20;
        const containerWidth = dimensions.width - padding * 2;
        const containerHeight = dimensions.height - padding * 2;

        // Calculate scale to fit content within container
        // If content is smaller than container, we might not want to scale up too much, 
        // but for now let's just ensure it fits.
        // We add a small safety margin (0.95)
        const scaleX = contentWidth > 0 ? containerWidth / contentWidth : 1;
        const scaleY = contentHeight > 0 ? containerHeight / contentHeight : 1;
        const scale = Math.min(scaleX, scaleY, 1) * 0.95;

        // Center offset
        // The packing algorithm usually centers around 0,0 but not guaranteed to be perfectly centered in bounding box
        // We want to center the bounding box in the container
        // Actually, since we are positioning absolutely from center (left: 50%, top: 50%), 
        // and the packing is around 0,0, we just need to scale coordinates.
        // However, to be precise, we should center the bounding box.

        const contentCenterX = (minX + maxX) / 2;
        const contentCenterY = (minY + maxY) / 2;

        return data.map(item => {
            const layout = packed.find(p => p.id === item.id)!;
            return {
                ...item,
                // Adjust coordinates to be relative to the center of the bounding box
                x: (layout.x - contentCenterX) * scale,
                y: (layout.y - contentCenterY) * scale,
                r: layout.r * scale
            };
        });
    }, [transactions, mode, dimensions]);

    if (transactions.filter(t => t.type === 'expense').length === 0) {
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
        if (onBubbleClick && mode === 'separated') {
            onBubbleClick(categoryId);
        } else if (mode === 'cluster') {
            navigate('/statistics');
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full flex items-center justify-center overflow-hidden"
            style={{ height }}
        >
            {/* Gooey Filter - Only for cluster mode */}
            {mode === 'cluster' && (
                <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                    <defs>
                        <filter id="goo">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="15" result="blur" colorInterpolationFilters="sRGB" />
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
                    filter: mode === 'cluster' ? 'url(#goo)' : 'none',
                    // WebKit sometimes needs this to force hardware acceleration for filters
                    transform: 'translate3d(0,0,0)'
                }}
            >
                {bubbles.map((bubble) => {
                    // Disable complex CSS filters inside the SVG filter for better compatibility
                    const bubbleEffects = mode === 'cluster'
                        ? '' // Gooey mode handles the look
                        : 'shadow-lg backdrop-blur-md'; // Separated mode gets shadows/blur

                    return (
                        <motion.div
                            key={bubble.id}
                            layout
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: 1,
                                opacity: 1, // Increased opacity for better color matrix result
                                x: bubble.x,
                                y: bubble.y,
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 120,
                                damping: 15,
                                mass: 1,
                                layout: { duration: 0.3 }
                            }}
                            onClick={() => handleBubbleClick(bubble.id)}
                            className={`absolute flex flex-col items-center justify-center rounded-full ${bubbleEffects} ${mode === 'cluster' || (mode === 'separated' && onBubbleClick) ? 'cursor-pointer' : ''}`}
                            style={{
                                width: bubble.r * 2,
                                height: bubble.r * 2,
                                backgroundColor: bubble.category.color,
                                opacity: 1,
                                zIndex: 10,
                                left: '50%',
                                top: '50%',
                                marginLeft: -bubble.r,
                                marginTop: -bubble.r,
                            }}
                        >
                            <span className="text-white font-bold text-lg drop-shadow-md text-center leading-tight" style={{ fontSize: Math.max(10, bubble.r * 0.4) }}>
                                ${bubble.value.toLocaleString()}
                            </span>
                            {bubble.r > 30 && (
                                <span className="text-white/90 font-medium drop-shadow-md mt-1 text-center leading-tight px-1" style={{ fontSize: Math.max(8, bubble.r * 0.25) }}>
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
