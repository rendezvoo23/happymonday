import { PencilIcon, TrashIcon, getIconComponent } from "@/components/icons";
import { useCategoryLabel } from "@/hooks/useCategoryLabel";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import { getCategoryColor } from "@/stores/categoryStore";
import type { Tables } from "@/types/supabase";
import { format, parseISO } from "date-fns";
import {
  ar,
  de,
  enUS,
  es,
  fr,
  hi,
  it,
  ja,
  ko,
  pt,
  ru,
  zhCN,
} from "date-fns/locale";
import { useState } from "react";
import { InlineButtonDialog } from "../ui/inline-button-dialog";
import { TransactionActionsMenu } from "./TransactionActionsMenu";

// Map locale codes to date-fns locales
const dateLocales = {
  en: enUS,
  es: es,
  fr: fr,
  de: de,
  ru: ru,
  zh: zhCN,
  ja: ja,
  pt: pt,
  it: it,
  ko: ko,
  ar: ar,
  hi: hi,
};

type Transaction = Tables<"transactions">;

interface TransactionWithCategory extends Transaction {
  categories: Pick<
    Tables<"categories">,
    "id" | "name" | "color" | "icon"
  > | null;
  subcategories: Pick<Tables<"subcategories">, "id" | "name" | "icon"> | null;
}

interface TransactionItemProps {
  transaction: TransactionWithCategory;
  onEdit: (t: TransactionWithCategory) => void;
  onDelete: (id: string) => void;
  zIndex?: number;
}

export function TransactionItem({
  transaction,
  onEdit,
  onDelete,
  zIndex = 1,
}: TransactionItemProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const category = transaction.categories;
  const subcategory = transaction.subcategories;
  const isExpense = transaction.direction === "expense";
  const { getCategoryLabel } = useCategoryLabel();
  const categoryLabel = subcategory?.name || getCategoryLabel(category?.name);
  const categoryColor = getCategoryColor(category?.color, category?.name);
  const { t } = useTranslation();

  // Use subcategory icon if subcategoryId exists and subcategory has an icon, otherwise fall back to category icon
  const iconToUse =
    transaction.subcategory_id && subcategory?.icon
      ? subcategory.icon
      : category?.icon || null;
  const iconComponent = getIconComponent(iconToUse);

  const { formatAmount } = useCurrency();
  const { locale } = useTranslation();

  // Get the date-fns locale based on current language
  const dateLocale = dateLocales[locale as keyof typeof dateLocales] || enUS;

  return (
    <>
      <div
        className={cn("flex items-center justify-between p-4 transition-all")}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm relative overflow-hidden"
            style={{ backgroundColor: categoryColor }}
          >
            {/* Glossy Effect on Circle */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
            {iconComponent ? (
              <div className="relative z-10 flex items-center justify-center">
                {iconComponent}
              </div>
            ) : (
              <span className="relative z-10">
                {subcategory ? categoryLabel.substring(0, 2).toUpperCase() : ""}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 leading-tight truncate">
              {categoryLabel}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {transaction.occurred_at
                ? format(parseISO(transaction.occurred_at), "MMM d", {
                    locale: dateLocale,
                  })
                : "N/A"}
              {transaction.note && ` • ${transaction.note}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          <span
            className={cn(
              "font-bold text-sm",
              isExpense
                ? "text-gray-900 dark:text-gray-100"
                : "text-green-600 dark:text-green-500"
            )}
          >
            {isExpense ? "-" : "+"}
            {formatAmount(transaction.amount)}
          </span>

          <InlineButtonDialog
            height={90}
            width={200}
            zIndex={zIndex}
            buttonSize={24}
            useOutsideClick
          >
            {({ onClose }) => {
              return (
                <div className="flex flex-col gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      onEdit(transaction);
                      onClose?.();
                    }}
                    className="w-full flex items-start gap-4 text-sm justify-start"
                  >
                    <div className="flex items-center gap-4 text-left whitespace-nowrap overflow-hidden">
                      <PencilIcon className="w-5 h-5 shrink-0" />
                      <div className="truncate">{t("transactions.edit")}</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(transaction.id)}
                    className="w-full flex gap-4 text-sm text-red-500"
                  >
                    <div className="flex items-center gap-4 text-left whitespace-nowrap overflow-hidden">
                      <TrashIcon className="w-5 h-5 shrink-0" />
                      <div className="truncate">{t("transactions.delete")}</div>
                    </div>
                  </button>
                </div>
              );
            }}
          </InlineButtonDialog>
        </div>
      </div>

      <TransactionActionsMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        transaction={transaction}
        onEdit={() => onEdit(transaction)}
        onDelete={() => onDelete(transaction.id)}
      />
    </>
  );
}
