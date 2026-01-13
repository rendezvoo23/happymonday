import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import {
  ChartFillIcon,
  ChartIcon,
  GearBigIcon,
  HouseFillIcon,
  HouseIcon,
} from "../icons";

export function BottomNav() {
  const location = useLocation();

  const isHomeActive = location.pathname === "/home";
  const isStatsActive = location.pathname === "/statistics";
  const isSettingsActive = location.pathname === "/settings";

  return (
    <div className="fixed bottom-8 left-0 right-0 z-40 flex justify-between px-6 pointer-events-none">
      {/* Left Pill: Home & Stats */}
      <div className="flex items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-full shadow-glass dark:shadow-none p-1.5 pointer-events-auto border border-white/20 dark:border-white/10 gap-1">
        <Link
          to="/home"
          className={cn(
            "relative flex items-center justify-center w-12 h-12 rounded-full transition-all active:scale-90",
            isHomeActive
              ? "text-blue-500 dark:text-blue-400"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          )}
        >
          {isHomeActive && (
            <motion.div
              layoutId="nav-indicator-left"
              className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/20 rounded-full"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <div className="relative z-10">
            {isHomeActive ? (
              <HouseFillIcon className="w-6 h-6" />
            ) : (
              <HouseIcon className="w-6 h-6" />
            )}
          </div>
        </Link>

        <Link
          to="/statistics"
          className={cn(
            "relative flex items-center justify-center w-12 h-12 rounded-full transition-all active:scale-90",
            isStatsActive
              ? "text-blue-500 dark:text-blue-400"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          )}
        >
          {isStatsActive && (
            <motion.div
              layoutId="nav-indicator-left"
              className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/20 rounded-full"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <div className="relative z-10">
            {isStatsActive ? (
              <ChartFillIcon className="w-6 h-6" />
            ) : (
              <ChartIcon className="w-6 h-6" />
            )}
          </div>
        </Link>
      </div>

      {/* Right Pill: Settings */}
      <div className="flex items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-full shadow-glass dark:shadow-none p-1.5 pointer-events-auto border border-white/20 dark:border-white/10">
        <Link
          to="/settings"
          className={cn(
            "relative flex items-center justify-center w-12 h-12 rounded-full transition-all active:scale-90",
            isSettingsActive
              ? "text-blue-500 dark:text-blue-400"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          )}
        >
          {isSettingsActive && (
            <motion.div
              layoutId="nav-indicator-right"
              className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/20 rounded-full"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <div className="relative z-10">
            <GearBigIcon className="w-6 h-6" />
          </div>
        </Link>
      </div>
    </div>
  );
}
