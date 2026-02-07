import { useUserStore } from "@/stores/userStore";
import React, { useCallback, useMemo } from "react";

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
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    } catch (e) {
      console.error("Failed to create Intl.NumberFormat", e);
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
  }, [activeLocale, currency.code]);

  const wholeNumberFormatter = useCallback(
    ({
      showSign = false,
      showCurrencyCode = true,
    }: { showSign?: boolean; showCurrencyCode?: boolean }) => {
      return new Intl.NumberFormat(activeLocale, {
        ...(showCurrencyCode
          ? { style: "currency" as const, currency: currency.code }
          : { style: "decimal" as const }),
        signDisplay: showSign ? "always" : "auto",
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      });
    },
    [activeLocale, currency.code]
  );

  const signFormatter = useCallback(
    ({ showCurrencyCode = true }: { showCurrencyCode?: boolean }) => {
      try {
        return new Intl.NumberFormat(activeLocale, {
          ...(showCurrencyCode
            ? { style: "currency" as const, currency: currency.code }
            : { style: "decimal" as const }),
          currency: currency.code,
          signDisplay: "always",
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });
      } catch (e) {
        return formatter;
      }
    },
    [activeLocale, currency.code, formatter]
  );

  const isSymbolPrefix = useMemo(() => {
    try {
      // Use the anchor locale to determine correct symbol placement
      const anchorFormatter = new Intl.NumberFormat(activeLocale, {
        style: "currency",
        currency: currency.code,
      });
      const parts = anchorFormatter.formatToParts(1000);
      const currencyIndex = parts.findIndex((p) => p.type === "currency");
      const integerIndex = parts.findIndex((p) => p.type === "integer");
      return currencyIndex < integerIndex;
    } catch (e) {
      return true;
    }
  }, [activeLocale, currency.code]);

  const formatAmount = (
    amount: number,
    options?: {
      showSign?: boolean;
      hideFractions?: boolean;
      forceDecimal?: boolean;
      showCurrencyCode?: boolean;
    }
  ) => {
    const {
      showSign,
      hideFractions,
      forceDecimal,
      showCurrencyCode = true,
    } = options || {};

    // Check if number has decimals
    const hasDecimals = forceDecimal || !Number.isInteger(amount);

    // If showing fractions and number has decimals, use 2 decimal places
    let fmt: Intl.NumberFormat;
    if (hideFractions) {
      fmt = wholeNumberFormatter({ showSign, showCurrencyCode });
    } else if (hasDecimals) {
      // Create formatter with exactly 2 decimal places for numbers with decimals
      try {
        fmt = new Intl.NumberFormat(activeLocale, {
          ...(showCurrencyCode
            ? { style: "currency" as const, currency: currency.code }
            : { style: "decimal" as const }),
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          signDisplay: showSign ? "always" : "auto",
        });
      } catch (e) {
        fmt = showSign
          ? signFormatter({ showCurrencyCode })
          : showCurrencyCode
            ? formatter
            : new Intl.NumberFormat(activeLocale, {
                style: "decimal",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
                signDisplay: "auto",
              });
      }
    } else {
      fmt = showSign
        ? signFormatter({ showCurrencyCode })
        : showCurrencyCode
          ? formatter
          : new Intl.NumberFormat(activeLocale, {
              style: "decimal",
              maximumFractionDigits: 0,
              minimumFractionDigits: 0,
              signDisplay: "auto",
            });
    }

    // Format the amount and replace comma decimal separator with dot
    const formatted = fmt.format(amount);
    // Replace decimal comma with dot (e.g., "100,50 ₽" -> "100.50 ₽")
    // This regex ensures we only replace the decimal comma, not thousand separators
    return formatted.replace(/(\d),(\d)/g, "$1.$2");
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
