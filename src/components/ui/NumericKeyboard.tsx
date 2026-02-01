import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Delete } from "lucide-react";
import { useRef } from "react";

interface NumericKeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  className?: string;
}

export function NumericKeyboard({
  onKeyPress,
  onBackspace,
  className,
}: NumericKeyboardProps) {
  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "⌫"],
  ];

  const touchUsedRef = useRef(false);

  const handleKeyPress = (key: string) => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
    }

    if (key === "⌫") {
      onBackspace();
    } else {
      onKeyPress(key);
    }
  };

  const handleTouchEnd = (key: string) => {
    touchUsedRef.current = true;
    handleKeyPress(key);
    // Reset after a short delay to allow onClick to be skipped
    setTimeout(() => {
      touchUsedRef.current = false;
    }, 100);
  };

  const handleClick = (key: string) => {
    // Skip if touch was used
    if (touchUsedRef.current) return;
    handleKeyPress(key);
  };

  return (
    <div
      className={cn("grid grid-cols-3 gap-2 w-full max-w-[500px]", className)}
    >
      {keys.flat().map((key) => (
        <motion.button
          key={key}
          type="button"
          onClick={() => handleClick(key)}
          onTouchEnd={() => handleTouchEnd(key)}
          style={{ borderBottom: "none", borderRight: "none" }}
          className={cn(
            "h-[60px] rounded-full font-light text-3xl",
            "bg-gray-100 dark:bg-gray-800",
            "text-gray-900 dark:text-gray-100",
            "border border-[#ffffff1a]",
            "active:scale-95 transition-all duration-100",
            "hover:bg-gray-200 dark:hover:bg-gray-700",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
            key === "⌫" &&
              "flex items-center justify-center bg-transparent border-none dark:bg-transparent"
          )}
          whileTap={{ scale: 1.1 }}
        >
          {key === "⌫" ? <Delete className="w-6 h-6" /> : key}
        </motion.button>
      ))}
    </div>
  );
}
