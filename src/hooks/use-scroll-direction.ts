import { useCallback, useEffect, useRef, useState } from "react";

type ScrollDirection = "up" | "down" | null;

interface UseScrollDirectionOptions {
  /** Scroll threshold in px before direction is considered changed. Default 8. */
  threshold?: number;
  /** Element to listen to (default: window). */
  scrollTarget?: Window | HTMLElement | null;
}

/**
 * Returns the current scroll direction: "up", "down", or null (at top / not enough movement).
 */
export function useScrollDirection(
  options: UseScrollDirectionOptions = {}
): ScrollDirection {
  const {
    threshold = 8,
    scrollTarget = typeof window !== "undefined" ? window : null,
  } = options;
  const [direction, setDirection] = useState<ScrollDirection>(null);
  const lastY = useRef(0);
  const ticking = useRef(false);

  const getScrollY = useCallback(() => {
    if (!scrollTarget) return 0;
    if (scrollTarget === window) return window.scrollY ?? window.pageYOffset;
    return (scrollTarget as HTMLElement).scrollTop;
  }, [scrollTarget]);

  useEffect(() => {
    if (!scrollTarget) return;

    const handleScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = getScrollY();
        const delta = y - lastY.current;
        if (Math.abs(delta) >= threshold) {
          setDirection(delta > 0 ? "down" : "up");
          lastY.current = y;
        }
        if (y <= 0) setDirection(null);
        ticking.current = false;
      });
    };

    lastY.current = getScrollY();
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollTarget.removeEventListener("scroll", handleScroll);
  }, [scrollTarget, getScrollY, threshold]);

  return direction;
}
