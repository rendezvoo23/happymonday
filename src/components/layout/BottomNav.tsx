import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChartFillIcon,
  ChartIcon,
  GearBigIcon,
  HouseFillIcon,
  HouseIcon,
} from "../icons";
import { SettingsDrawer } from "./SettingsDrawer";

export function BottomNav() {
  const location = useLocation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isHomeActive = location.pathname === "/home";
  const isStatsActive = location.pathname === "/statistics";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none pb-[calc(var(--safe-area-bottom)+1.5rem)] pt-4">
      <div className="responsive-container flex justify-between items-center">
        {/* Left Pill: Home & Stats */}
        <div className="flex items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-full shadow-medium p-1.5 pointer-events-auto border border-white/20 dark:border-white/10 gap-1">
          <Link
            to="/home"
            onClick={() => {
              if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.selectionChanged();
              }
            }}
            className={cn(
              "relative flex items-center justify-center w-12 h-12 rounded-full transition-all",
              isHomeActive
                ? "text-blue-500 dark:text-blue-400"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            )}
          >
            {isHomeActive && (
              <motion.div
                layoutId="nav-indicator-left"
                className="absolute inset-0 bg-blue-50 dark:bg-blue-900/30 rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <motion.div whileTap={{ scale: 0.88 }} className="relative z-10">
              {isHomeActive ? (
                <HouseFillIcon className="w-6 h-6" />
              ) : (
                <HouseIcon className="w-6 h-6" />
              )}
            </motion.div>
          </Link>

          <Link
            to="/statistics"
            onClick={() => {
              if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.selectionChanged();
              }
            }}
            className={cn(
              "relative flex items-center justify-center w-12 h-12 rounded-full transition-all",
              isStatsActive
                ? "text-blue-500 dark:text-blue-400"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            )}
          >
            {isStatsActive && (
              <motion.div
                layoutId="nav-indicator-left"
                className="absolute inset-0 bg-blue-50 dark:bg-blue-900/30 rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <motion.div whileTap={{ scale: 0.88 }} className="relative z-10">
              {isStatsActive ? (
                <ChartFillIcon className="w-6 h-6" />
              ) : (
                <ChartIcon className="w-6 h-6" />
              )}
            </motion.div>
          </Link>
        </div>

        {/* Right Pill: Settings */}
        <div className="flex items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-full shadow-medium p-1.5 pointer-events-auto border border-white/20 dark:border-white/10">
          <button
            type="button"
            onClick={() => {
              if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.selectionChanged();
              }
              setIsSettingsOpen(true);
            }}
            className={cn(
              "relative flex items-center justify-center w-12 h-12 rounded-full transition-all",
              isSettingsOpen
                ? "text-blue-500 dark:text-blue-400"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            )}
          >
            {isSettingsOpen && (
              <motion.div
                layoutId="nav-indicator-right"
                className="absolute inset-0 bg-blue-50 dark:bg-blue-900/30 rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <motion.div whileTap={{ scale: 0.88 }} className="relative z-10">
              <GearBigIcon className="w-6 h-6" />
            </motion.div>
          </button>
        </div>

        {/* Settings Drawer */}
        <SettingsDrawer
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </div>
  );
}
