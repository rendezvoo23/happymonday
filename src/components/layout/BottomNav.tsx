import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Bot, Home, PieChart, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export function BottomNav() {
  const location = useLocation();

  const tabs = [
    { path: "/dashboard", label: "Home", icon: Home },
    { path: "/statistics", label: "Stats", icon: PieChart },
    { path: "/ai", label: "AI", icon: Bot },
    { path: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
      <div className="flex items-center bg-white/80 backdrop-blur-xl rounded-full shadow-soft p-1 pointer-events-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "relative flex items-center justify-center w-16 h-12 rounded-full transition-colors",
                isActive ? "text-blue-500" : "text-gray-400 hover:text-gray-600"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-blue-50 rounded-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                <Icon
                  className={cn("w-6 h-6", isActive && "fill-current")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
