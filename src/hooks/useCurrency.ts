import { useUserStore } from "@/stores/userStore";
import React, { useMemo } from "react";

/**
 * Map of currencies to their "native" or most "standard" locale for symbol placement.
 * This ensures that $ is always a prefix and ₽ is always a suffix, regardless of the user's UI language.
 */
const CURRENCY_ANCHOR_LOCALES: Record<string, string> = {
  USD: "en-US", // $100.00
  RUB: "ru-RU", // 100,00 ₽
  GBP: "en-GB", // £100.00
  JPY: "ja-JP", // ¥100
  EUR: "en-IE", // €100.00 (Common international prefix placement)
  CNY: "zh-CN", // ¥100.00
};

export function useCurrency() {
  const { settings, currencies } = useUserStore();

  const currency = useMemo(() => {
    if (!settings?.default_currency || currencies.length === 0) {
      return { code: "USD", symbol: "$" };
    }
    return (
      currencies.find((c) => c.code === settings.default_currency) || {
        code: "USD",
        symbol: "$",
      }
    );
  }, [settings?.default_currency, currencies]);

  // The locale for number formatting (separators)
  const userLocale = useMemo(() => {
    if (settings?.language === "ru") return "ru-RU";
    if (settings?.language === "en") return "en-US";
    return navigator.language || "en-US";
  }, [settings?.language]);

  /**
   * The locale for the final formatter.
   * We prioritize the "anchor" locale for the chosen currency to get the placement right,
   * but we fallback to the user's locale for other currencies.
   */
  const activeLocale = useMemo(() => {
    return CURRENCY_ANCHOR_LOCALES[currency.code] || userLocale;
  }, [currency.code, userLocale]);

  const formatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(activeLocale, {
        style: "currency",
        currency: currency.code,
      });
    } catch (e) {
      console.error("Failed to create Intl.NumberFormat", e);
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      });
    }
  }, [activeLocale, currency.code]);

  const wholeNumberFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(activeLocale, {
        style: "currency",
        currency: currency.code,
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      });
    } catch (e) {
      return formatter;
    }
  }, [activeLocale, currency.code, formatter]);

  const signFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(activeLocale, {
        style: "currency",
        currency: currency.code,
        signDisplay: "always",
      });
    } catch (e) {
      return formatter;
    }
  }, [activeLocale, currency.code, formatter]);

  const wholeNumberSignFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(activeLocale, {
        style: "currency",
        currency: currency.code,
        signDisplay: "always",
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      });
    } catch (e) {
      return wholeNumberFormatter;
    }
  }, [activeLocale, currency.code, wholeNumberFormatter]);

  const isSymbolPrefix = useMemo(() => {
    try {
      const parts = formatter.formatToParts(1000);
      const currencyIndex = parts.findIndex((p) => p.type === "currency");
      const integerIndex = parts.findIndex((p) => p.type === "integer");
      return currencyIndex < integerIndex;
    } catch (e) {
      return true;
    }
  }, [formatter]);

  const formatAmount = (
    amount: number,
    options?: { showSign?: boolean; hideFractions?: boolean }
  ) => {
    const { showSign, hideFractions } = options || {};

    // Note: For now we use the activeLocale (anchor locale) which has "correct" separators for that currency.
    // If the user wants RU separators for USD (e.g. $100,00), we would need transformToParts logic.
    // But usually using the currency's native separators is preferred for financial accuracy.

    let fmt: Intl.NumberFormat;
    if (showSign) {
      fmt = hideFractions ? wholeNumberSignFormatter : signFormatter;
    } else {
      fmt = hideFractions ? wholeNumberFormatter : formatter;
    }

    return fmt.format(amount);
  };

  const formatCompactAmount = (amount: number) => {
    const absAmount = Math.abs(amount);
    let value: number;
    let suffix: string;

    if (absAmount >= 1_000_000) {
      // Format as millions
      value = amount / 1_000_000;
      suffix = "M";
    } else if (absAmount >= 1_000) {
      // Format as thousands
      value = amount / 1_000;
      suffix = "K";
    } else {
      // Format normally for values under 1000
      return formatAmount(amount, { hideFractions: true });
    }

    // Format the value with 2 decimal places and remove trailing zeros
    const formatted = Number.parseFloat(value.toFixed(2)).toString();

    // Add currency symbol in the correct position
    if (isSymbolPrefix) {
      return `${currency.symbol}${formatted}${suffix}`;
    }
    return React.createElement(
      "div",
      null,
      React.createElement("span", { style: { opacity: 1.0 } }, formatted),
      React.createElement(
        "span",
        { style: { opacity: 0.8, fontWeight: 400, marginLeft: 2 } },
        suffix
      )
    );
  };

  return {
    symbol: currency.symbol,
    code: currency.code,
    formatAmount,
    formatCompactAmount,
    formatter,
    isSymbolPrefix,
  };
}
