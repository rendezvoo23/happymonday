import { motion } from "framer-motion";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {keys.flat().map((key) => (
        <motion.button
          key={key}
          type="button"
          onClick={() => handleKeyPress(key)}
          className={cn(
            "h-14 rounded-2xl font-semibold text-xl",
            "bg-gray-100 dark:bg-gray-800",
            "text-gray-900 dark:text-gray-100",
            "active:scale-95 transition-all duration-100",
            "hover:bg-gray-200 dark:hover:bg-gray-700",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
            key === "⌫" && "flex items-center justify-center"
          )}
          whileTap={{ scale: 0.95 }}
        >
          {key === "⌫" ? (
            <Delete className="w-6 h-6" />
          ) : (
            key
          )}
        </motion.button>
      ))}
    </div>
  );
}
