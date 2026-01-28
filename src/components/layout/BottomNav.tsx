import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ChartFillIcon,
  ChartIcon,
  GearBigIcon,
  HouseFillIcon,
  HouseIcon,
} from "../icons";
import "@/pages/button.css";

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isHomeActive = location.pathname === "/home";
  const isStatsActive = location.pathname === "/statistics";
  const isSettingsActive = location.pathname === "/settings";

  // Setup Telegram Settings Button - navigate to settings page instead of drawer
  useEffect(() => {
    console.log("BottomNav: Setting up Telegram Settings Button");
    console.log("Telegram WebApp exists:", !!window.Telegram?.WebApp);
    console.log(
      "SettingsButton exists:",
      !!window.Telegram?.WebApp?.SettingsButton
    );

    if (window.Telegram?.WebApp?.SettingsButton) {
      const settingsButton = window.Telegram.WebApp.SettingsButton;

      // Create handler for settings button
      const handleSettingsButtonPressed = () => {
        console.log("✅ Settings button pressed handler called!");
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
        }
        navigate("/settings");
      };

      // Show the settings button and register click handler
      console.log("Showing settings button...");
      settingsButton.show();
      console.log("Registering onClick handler...");
      settingsButton.onClick(handleSettingsButtonPressed);
      console.log("Settings button setup complete");

      // Cleanup
      return () => {
        console.log("Cleaning up settings button...");
        settingsButton.offClick(handleSettingsButtonPressed);
        settingsButton.hide();
      };
    }
  }, [navigate]);

  return (
    <div className="fixed bottom-8 left-0 right-0 z-40 flex items-center justify-center px-6 pointer-events-none">
      {/* Liquid Glass Navigation */}
      <div className="liquid-glass-nav-wrap">
        <div className="liquid-glass-nav">
          <Link
            to="/home"
            onClick={() => {
              if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.selectionChanged();
              }
            }}
            className={cn("liquid-glass-nav-item", isHomeActive && "active")}
          >
            <motion.div whileTap={{ scale: 0.88 }} className="relative z-10">
              {isHomeActive ? (
                <HouseFillIcon
                  className="nav-icon"
                  style={
                    isHomeActive ? { color: "var(--primary-color)" } : undefined
                  }
                />
              ) : (
                <HouseIcon className="nav-icon" />
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
            className={cn("liquid-glass-nav-item", isStatsActive && "active")}
          >
            <motion.div whileTap={{ scale: 0.88 }} className="relative z-10">
              {isStatsActive ? (
                <ChartFillIcon
                  className="nav-icon"
                  style={
                    isStatsActive
                      ? { color: "var(--primary-color)" }
                      : undefined
                  }
                />
              ) : (
                <ChartIcon className="nav-icon" />
              )}
            </motion.div>
          </Link>

          <Link
            to="/settings"
            onClick={() => {
              if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.selectionChanged();
              }
            }}
            className={cn(
              "liquid-glass-nav-item",
              isSettingsActive && "active"
            )}
          >
            <motion.div whileTap={{ scale: 0.88 }} className="relative z-10">
              <GearBigIcon
                className="nav-icon"
                style={
                  isSettingsActive
                    ? { color: "var(--primary-color)" }
                    : undefined
                }
              />
            </motion.div>
          </Link>
        </div>
        <div className="liquid-glass-nav-shadow" />
      </div>
    </div>
  );
}
