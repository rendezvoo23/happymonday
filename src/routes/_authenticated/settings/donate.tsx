import { Header } from "@/components/layout/Header";
import { LiquidButton } from "@/components/ui/button/button";
import { supabase } from "@/lib/supabaseClient";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, Star } from "lucide-react";
import { useState } from "react";

const BASE_DONATE_URL = "https://t.me/WhySpentBot?start=donate";

export const Route = createFileRoute("/_authenticated/settings/donate")({
  component: DonateSettingsPage,
});

function DonateSettingsPage() {
  const navigate = useNavigate();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Predefined donation amounts in Telegram Stars
  const donateAmounts = [
    { stars: 50, label: "☕ Coffee" },
    { stars: 100, label: "🍕 Pizza" },
    { stars: 250, label: "💝 Thank you" },
    { stars: 500, label: "❤️ Love it" },
    { stars: 1000, label: "🌟 Super fan" },
    { stars: 2500, label: "💎 Generous" },
  ];

  const handleDonate = async (amount: number) => {
    if (isProcessing || amount <= 0) return;

    setIsProcessing(true);

    try {
      if (window.Telegram?.WebApp?.openInvoice) {
        // Step 1: Create invoice link via Supabase edge function
        console.log("Creating invoice for", amount, "stars...");

        let invoiceUrl: string;

        try {
          const { data, error } = await supabase.functions.invoke(
            "create-telegram-invoice",
            {
              body: {
                amount: amount,
                title: `Donate ${amount} Stars`,
                payload: `donate_${amount}_${Date.now()}`,
              },
            }
          );

          if (error) {
            console.error("Failed to create invoice:", error);
            throw error;
          }

          if (!data?.ok || !data?.result) {
            console.error("Invalid invoice response:", data);
            throw new Error("Failed to create invoice");
          }

          // Step 2: Get the invoice link
          invoiceUrl = data.result;
          console.log("Invoice created:", invoiceUrl);
        } catch (invoiceError) {
          console.error("Invoice creation error:", invoiceError);
          // In dev mode or if edge function fails, use mock invoice URL
          invoiceUrl = `mock://telegram/invoice/${amount}`;
          console.log("Using mock invoice URL:", invoiceUrl);
        }

        // Step 3: Open the invoice in the Mini App
        window.Telegram.WebApp.openInvoice(invoiceUrl, (status) => {
          console.log("Payment status:", status);

          if (status === "paid") {
            if (window.Telegram?.WebApp?.HapticFeedback) {
              window.Telegram.WebApp.HapticFeedback.notificationOccurred(
                "success"
              );
            }
            // Navigate back after successful payment
            setTimeout(() => {
              navigate({ to: "/settings/main" });
            }, 500);
          } else if (status === "failed") {
            if (window.Telegram?.WebApp?.HapticFeedback) {
              window.Telegram.WebApp.HapticFeedback.notificationOccurred(
                "error"
              );
            }
          }

          setIsProcessing(false);
        });
      } else {
        // Fallback to opening bot with start parameter
        console.log("openInvoice not available, using fallback");
        const fallbackUrl = `${BASE_DONATE_URL}_${amount}`;
        if (window.Telegram?.WebApp?.openTelegramLink) {
          window.Telegram.WebApp.openTelegramLink(fallbackUrl);
        } else {
          window.open(fallbackUrl, "_blank");
        }
        setIsProcessing(false);
        navigate({ to: "/settings/main" });
      }
    } catch (error) {
      console.error("Payment error:", error);
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred("error");
      }
      setIsProcessing(false);
    }
  };

  const handleCustomDonate = () => {
    const amount = Number.parseInt(customAmount, 10);
    if (!Number.isNaN(amount) && amount > 0) {
      handleDonate(amount);
    }
  };

  return (
    <>
      <Header>
        <div className="flex items-center justify-center w-full relative px-6">
          <LiquidButton
            type="button"
            variant="liquid"
            size="icon-lg"
            onClick={() => navigate({ to: "/settings/main" })}
            className="absolute left-4"
          >
            <ChevronLeft className="w-5 h-5" />
          </LiquidButton>
          <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Support Us
          </div>
        </div>
      </Header>
      <div className="px-6 pb-8 space-y-6">
        {/* Description */}
        <div className="text-center space-y-2">
          <div className="text-4xl">⭐</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Support our development with Telegram Stars
          </p>
        </div>

        {/* Predefined amounts */}
        <div className="grid grid-cols-2 gap-3">
          {donateAmounts.map((item) => (
            <motion.button
              key={item.stars}
              type="button"
              onClick={() => {
                if (window.Telegram?.WebApp?.HapticFeedback) {
                  window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
                }
                setSelectedAmount(item.stars);
                setCustomAmount("");
                handleDonate(item.stars);
              }}
              disabled={isProcessing}
              whileTap={{ scale: 0.95 }}
              className={`
                p-4 rounded-2xl border-2 transition-all
                ${
                  selectedAmount === item.stars
                    ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                }
                ${
                  isProcessing
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-yellow-300 hover:bg-yellow-50/50 dark:hover:bg-yellow-900/10"
                }
              `}
            >
              <div className="flex flex-col items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
                  {item.stars}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {item.label}
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="space-y-2">
          <label
            htmlFor="custom-donate-amount"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Custom Amount
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500" />
              <input
                id="custom-donate-amount"
                type="number"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                placeholder="Enter amount"
                min="1"
                disabled={isProcessing}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-yellow-400 focus:outline-none disabled:opacity-50"
              />
            </div>
            <button
              type="button"
              onClick={handleCustomDonate}
              disabled={
                isProcessing ||
                !customAmount ||
                Number.parseInt(customAmount) <= 0
              }
              className="px-6 py-3 rounded-xl bg-yellow-500 text-white font-medium hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? "..." : "Send"}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          <p>Payments are processed securely through Telegram Stars</p>
        </div>
      </div>
    </>
  );
}
