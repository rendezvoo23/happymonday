import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { GearBigIcon } from "../icons";

export function BottomNav() {
  const location = useLocation();

  const isProfileActive = location.pathname === "/profile";

  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-end px-6 pointer-events-none">
      <div className="flex items-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-full shadow-soft dark:shadow-none p-1 pointer-events-auto transition-colors duration-200 border border-white/20 dark:border-white/10">
        <Link
          to="/profile"
          className={cn(
            "relative flex items-center justify-center w-14 h-14 rounded-full transition-colors",
            isProfileActive
              ? "text-blue-500 dark:text-blue-400"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          )}
        >
          {isProfileActive && (
            <motion.div
              layoutId="nav-indicator"
              className="absolute inset-0 bg-blue-50 dark:bg-blue-900/30 rounded-full"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <div className="relative z-10 flex flex-col items-center">
            <GearBigIcon
              className={cn("w-7 h-7", isProfileActive && "fill-current")}
              strokeWidth={isProfileActive ? 2.5 : 2}
            />
          </div>
        </Link>
      </div>
    </div>
  );
}
