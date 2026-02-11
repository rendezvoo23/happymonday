import { useDate } from "@/context/DateContext";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import "@/pages/styles.css";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ChartFillIcon,
  ChartIcon,
  GearBigIcon,
  HouseFillIcon,
  HouseIcon,
} from "../icons";
import "./navigation.css";

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { selectedDate } = useDate();

  const isHomeActive = location.pathname === "/home";
  const isStatsActive =
    location.pathname === "/statistics" ||
    location.pathname.startsWith("/statistics/") ||
    location.pathname.startsWith("/edit/");
  const isSettingsActive =
    location.pathname === "/settings" ||
    location.pathname.startsWith("/settings/");

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
        navigate({ to: "/settings/main" });
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

  const homeSearch = { month: getMonthKey(selectedDate) };
  const statsSearch = {
    month: getMonthKey(selectedDate),
    mode: "week" as const,
    category: undefined as string | undefined,
  };
  const navItems = [
    {
      to: "/home",
      search: homeSearch,
      icon: HouseIcon,
      iconFill: HouseFillIcon,
      label: t("nav.home"),
      isActive: isHomeActive,
    },
    {
      to: "/statistics",
      search: statsSearch,
      icon: ChartIcon,
      iconFill: ChartFillIcon,
      label: t("nav.statistics"),
      isActive: isStatsActive,
    },
    {
      to: "/settings/main",
      icon: GearBigIcon,
      iconFill: GearBigIcon,
      label: t("nav.settings"),
      isActive: isSettingsActive,
    },
  ];

  // Get active item index for background position
  const activeIndex = navItems.findIndex((item) => item.isActive);

  return (
    <div className="navigation-container">
      {/* Liquid Glass Navigation */}
      <div className="liquid-glass-nav-wrap">
        <div className="liquid-glass-nav">
          {/* Animated background slider */}
          <div
            className="liquid-glass-nav-slider"
            style={{
              transform: `translateX(calc(var(--nav-item-width) * ${activeIndex} + var(--nav-gap) * ${activeIndex}))`,
            }}
          />

          {navItems.map((item) => {
            const Icon = item.isActive ? item.iconFill : item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                {...(item.search && { search: item.search })}
                onClick={() => {
                  if (window.Telegram?.WebApp?.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.selectionChanged();
                  }
                }}
                className={cn(
                  "liquid-glass-nav-item",
                  item.isActive && "active"
                )}
              >
                <div className="liquid-glass-nav-content">
                  <Icon
                    className="nav-icon"
                    style={
                      item.isActive
                        ? { color: "var(--accent-color)" }
                        : undefined
                    }
                  />
                  <span className="nav-label">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="liquid-glass-nav-shadow" />
      </div>
    </div>
  );
}
