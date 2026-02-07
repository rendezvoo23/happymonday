import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Delete } from "lucide-react";
import { useRef } from "react";

interface NumericKeyboardProps {
  onKeyPress: (key: string) => void;
  onBackspace: () => void;
  className?: string;
}

const KEY_LABELS: Record<string, string> = {
  "1": "",
  "2": "ABC",
  "3": "DEF",
  "4": "GHI",
  "5": "JKL",
  "6": "MNO",
  "7": "PQRS",
  "8": "TUV",
  "9": "WXYZ",
};

const keys = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "⌫"],
];

export function NumericKeyboard({
  onKeyPress,
  onBackspace,
  className,
}: NumericKeyboardProps) {
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
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred("medium");
    }
    touchUsedRef.current = true;
    handleKeyPress(key);
    setTimeout(() => {
      touchUsedRef.current = false;
    }, 100);
  };

  const handleClick = (key: string) => {
    if (touchUsedRef.current) return;
    handleKeyPress(key);
  };

  return (
    <div className={cn("numeric-keyboard", className)}>
      {keys.flat().map((key) => (
        <motion.button
          key={key}
          type="button"
          onClick={() => handleClick(key)}
          onTouchEnd={() => handleTouchEnd(key)}
          className={cn(
            "numeric-keyboard__key",
            key === "⌫" && "numeric-keyboard__key--backspace"
          )}
          whileTap={{ scale: 0.95 }}
        >
          {key === "⌫" ? (
            <Delete className="w-6 h-6" strokeWidth={2} />
          ) : (
            <>
              <span>{key}</span>
              {KEY_LABELS[key] && (
                <span className="numeric-keyboard__letter">{KEY_LABELS[key]}</span>
              )}
            </>
          )}
        </motion.button>
      ))}
    </div>
  );
}
