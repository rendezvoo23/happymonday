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

  const tabs = [
    {
      path: "/home",
      label: "Home",
      icon: HouseIcon,
      activeIcon: HouseFillIcon,
    },
    {
      path: "/statistics",
      label: "Stats",
      icon: ChartIcon,
      activeIcon: ChartFillIcon,
    },
    { path: "/profile", label: "Profile", icon: GearBigIcon },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
      <div className="flex items-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-full shadow-soft dark:shadow-none p-1 pointer-events-auto transition-colors duration-200 border border-white/20 dark:border-white/10">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "relative flex items-center justify-center w-16 h-12 rounded-full transition-colors",
                isActive
                  ? "text-blue-500 dark:text-blue-400"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-blue-50 dark:bg-blue-900/30 rounded-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                {isActive && tab.activeIcon ? (
                  <tab.activeIcon
                    className={cn("w-6 h-6", isActive && "fill-current")}
                  />
                ) : (
                  <Icon
                    className={cn("w-6 h-6", isActive && "fill-current")}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
