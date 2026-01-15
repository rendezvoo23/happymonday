/**
 * Example Component: Demonstrating Localization Usage
 *
 * This component shows how to use the localization system in your components.
 * It can be deleted - it's only for reference.
 */

import { useTranslation } from "@/hooks/useTranslation";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function LocalizationExample() {
  const { t, locale, languages } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas-default">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-canvas-default/80 backdrop-blur-xl border-b border-border-subtle">
        <div className="flex items-center gap-3 p-4">
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="p-2 hover:bg-canvas-subtle rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-gray-100" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Localization Example
          </h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">
          {/* Using basic translation */}
          {t("settings.title")}
        </h1>

        <p className="text-gray-600">
          {/* Current locale information */}
          Current Language: {locale} (
          {languages.find((l) => l.code === locale)?.nativeName})
        </p>

        <div className="space-y-2">
          {/* Common buttons */}
          <button
            type="button"
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            {t("common.save")}
          </button>

          <button
            type="button"
            className="px-4 py-2 bg-gray-500 text-white rounded ml-2"
          >
            {t("common.cancel")}
          </button>

          <button
            type="button"
            className="px-4 py-2 bg-red-500 text-white rounded ml-2"
          >
            {t("common.delete")}
          </button>
        </div>

        <div className="space-y-2">
          {/* Transaction-related translations */}
          <h2 className="text-xl font-semibold">{t("transactions.add")}</h2>

          <label className="block">
            {t("transactions.amount")}:
            <input
              type="number"
              placeholder={t("transactions.enterAmount")}
              className="ml-2 border rounded px-2 py-1"
            />
          </label>

          <label className="block">
            {t("transactions.category")}:
            <select className="ml-2 border rounded px-2 py-1">
              <option>{t("categories.food")}</option>
              <option>{t("categories.transport")}</option>
              <option>{t("categories.shopping")}</option>
            </select>
          </label>
        </div>

        <div className="space-y-2">
          {/* Date translations */}
          <h3 className="text-lg font-medium">{t("date.selectMonth")}</h3>
          <div className="grid grid-cols-3 gap-2">
            <span>{t("months.january")}</span>
            <span>{t("months.february")}</span>
            <span>{t("months.march")}</span>
          </div>
        </div>

        <div className="mt-4 p-4 bg-green-50 rounded">
          {/* Success message */}
          <p className="text-green-700">{t("success.transactionAdded")}</p>
        </div>

        <div className="mt-4 p-4 bg-red-50 rounded">
          {/* Error message */}
          <p className="text-red-700">{t("errors.generic")}</p>
        </div>
      </div>
    </div>
  );
}
