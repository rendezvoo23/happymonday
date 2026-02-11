import { getIconComponent } from "@/components/icons";
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
            <p className="text-[14px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {transaction.occurred_at
                ? format(parseISO(transaction.occurred_at), "HH:mm", {
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
            height={92}
            width={170}
            zIndex={zIndex}
            buttonSize={26}
            useOutsideClick
          >
            {({ onClose }) => {
              return (
                <div className="flex flex-col m-1">
                  <button
                    type="button"
                    onClick={() => {
                      onEdit(transaction);
                      onClose?.();
                    }}
                    className="w-full flex gap-4 text-md hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(0,0,0,0.2)] py-2 px-4 rounded-full"
                  >
                    <div className="flex items-center gap-4 text-left whitespace-nowrap overflow-hidden ">
                      <div className="w-5 h-5 shrink-0]">
                        <svg
                          version="1.1"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20.3949 19.9823"
                          aria-label="Edit icon"
                        >
                          <title>Edit</title>
                          <g>
                            <rect
                              height="19.9823"
                              opacity="0"
                              width="20.3949"
                              x="0"
                              y="0"
                            />
                            <path
                              d="M3.24919 18.8046L17.3312 4.74211L15.3293 2.73039L1.24723 16.7929L0.0265306 19.4882C-0.0906569 19.7616 0.202312 20.0741 0.475749 19.957ZM18.3761 3.72649L19.5578 2.55461C20.1632 1.94914 20.1925 1.31438 19.6554 0.777268L19.3039 0.425706C18.7765-0.101638 18.132-0.0528096 17.5363 0.533128L16.3449 1.705Z"
                              fill="currentColor"
                              fillOpacity="0.85"
                            />
                          </g>
                        </svg>
                      </div>
                      <div className="truncate">{t("transactions.edit")}</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(transaction.id);
                      onClose?.();
                    }}
                    className="w-full flex gap-4 text-md text-red-500 hover:bg-[rgba(0,0,0,0.05)] dark:hover:bg-[rgba(0,0,0,0.2)] py-2 px-4 rounded-full"
                  >
                    <div className="leading-[27px] flex items-center gap-4 text-left whitespace-nowrap overflow-hidden">
                      <div className="w-5 h-5 shrink-0">
                        <svg
                          version="1.1"
                          xmlns="http://www.w3.org/2000/svg"
                          xmlnsXlink="http://www.w3.org/1999/xlink"
                          viewBox="0 0 24.5703 30.0293"
                        >
                          <title>Delete</title>
                          <g>
                            <rect
                              height="30.0293"
                              opacity="0"
                              width="24.5703"
                              x="0"
                              y="0"
                            />
                            <path
                              d="M8.34961 23.9355C8.76953 23.9355 9.04297 23.6621 9.0332 23.2812L8.63281 9.50195C8.62305 9.12109 8.33984 8.86719 7.94922 8.86719C7.5293 8.86719 7.25586 9.13086 7.26562 9.52148L7.66602 23.2812C7.67578 23.6719 7.94922 23.9355 8.34961 23.9355ZM12.1094 23.9355C12.5195 23.9355 12.8125 23.6621 12.8125 23.2812L12.8125 9.52148C12.8125 9.13086 12.5195 8.86719 12.1094 8.86719C11.6992 8.86719 11.4062 9.13086 11.4062 9.52148L11.4062 23.2812C11.4062 23.6621 11.6992 23.9355 12.1094 23.9355ZM15.8594 23.9355C16.2598 23.9355 16.5332 23.6816 16.543 23.291L16.9434 9.52148C16.9531 9.13086 16.6797 8.87695 16.2695 8.87695C15.8789 8.87695 15.5957 9.12109 15.5859 9.51172L15.1855 23.2812C15.1758 23.6621 15.4395 23.9355 15.8594 23.9355ZM6.66992 5.58594L8.37891 5.58594L8.37891 2.90039C8.37891 2.11914 8.91602 1.61133 9.75586 1.61133L14.4336 1.61133C15.2734 1.61133 15.8105 2.11914 15.8105 2.90039L15.8105 5.58594L17.5195 5.58594L17.5195 2.80273C17.5195 1.06445 16.3965 0 14.5312 0L9.6582 0C7.80273 0 6.66992 1.06445 6.66992 2.80273ZM0.810547 6.43555L23.3984 6.43555C23.8477 6.43555 24.209 6.06445 24.209 5.625C24.209 5.17578 23.8477 4.80469 23.3984 4.80469L0.810547 4.80469C0.380859 4.80469 0 5.18555 0 5.625C0 6.07422 0.380859 6.43555 0.810547 6.43555ZM6.37695 27.8906L17.8516 27.8906C19.5312 27.8906 20.7129 26.748 20.8008 25.0684L21.7285 6.21094L19.9805 6.21094L19.1016 24.8926C19.0625 25.6836 18.4668 26.2598 17.6855 26.2598L6.51367 26.2598C5.75195 26.2598 5.14648 25.6738 5.10742 24.8926L4.17969 6.2207L2.49023 6.2207L3.41797 25.0781C3.50586 26.7578 4.66797 27.8906 6.37695 27.8906Z"
                              fill="currentColor"
                              fillOpacity="0.85"
                            />
                          </g>
                        </svg>
                      </div>
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
