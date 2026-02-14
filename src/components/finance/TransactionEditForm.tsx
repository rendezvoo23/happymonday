import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";

import { useDate } from "@/context/DateContext";
import { useTranslation } from "@/hooks/useTranslation";
import { type Subcategory, getSubcategories } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCategoryStore } from "@/stores/categoryStore";
import type { CategoryId, TransactionType } from "@/types";
import { Spinner } from "../spinner";
import { Button } from "../ui/Button";
import { CategorySelector } from "./CategorySelector";
import { SubcategorySelector } from "./SubcategorySelector";

interface TransactionEditFormProps {
  onSubmit: (data: {
    type: TransactionType;
    amount: number;
    categoryId: CategoryId;
    subcategoryId?: string | null;
    note: string;
    date: string;
  }) => void;
  initialData?: {
    type: TransactionType;
    amount: number;
    categoryId: CategoryId;
    subcategoryId?: string | null;
    note: string;
    date?: string;
  };
  initialType?: TransactionType;
}

export function TransactionEditForm({
  onSubmit,
  initialData,
  initialType = "expense",
}: TransactionEditFormProps) {
  const { selectedDate } = useDate();
  const { t } = useTranslation();

  const [type] = useState<TransactionType>(initialData?.type || initialType);
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [categoryId, setCategoryId] = useState<CategoryId>(
    initialData?.categoryId || ""
  );
  const [subcategoryId, setSubcategoryId] = useState<string | null>(
    initialData?.subcategoryId || null
  );
  const [note, setNote] = useState(initialData?.note || "");
  const [date, setDate] = useState(
    initialData?.date
      ? format(new Date(initialData.date), "yyyy-MM-dd HH:mm")
      : format(selectedDate, "yyyy-MM-dd HH:mm")
  );

  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false);
  const previousCategoryIdRef = useRef<CategoryId | null>(null);
  const initialSubcategoryIdRef = useRef<string | null>(
    initialData?.subcategoryId || null
  );
  const dateInputRef = useRef<HTMLInputElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [activeCategoryPanel, setActiveCategoryPanel] = useState(0);

  const {
    isLoading: categoriesLoading,
    loadCategories,
    getExpenseCategories,
    getIncomeCategories,
  } = useCategoryStore();

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Get categories filtered by type
  const categories =
    type === "expense" ? getExpenseCategories() : getIncomeCategories();

  // Set default category when categories are loaded or type changes
  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories.at(-1)?.id || "");
    } else if (categories.length > 0 && categoryId) {
      // Validate current category is valid for current type
      if (!categories.find((c) => c.id === categoryId)) {
        setCategoryId(categories[0].id);
      }
    }
  }, [categories, categoryId]);

  // Load subcategories when categoryId changes
  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      setSubcategoryId(null);
      previousCategoryIdRef.current = null;
      return;
    }

    const categoryChanged =
      previousCategoryIdRef.current !== null &&
      previousCategoryIdRef.current !== categoryId;
    const isInitialLoad = previousCategoryIdRef.current === null;
    previousCategoryIdRef.current = categoryId;

    if (categoryChanged) {
      // scroll to subcategory panel (end)
      const el = categoryScrollRef.current;
      if (el) {
        const scrollLeft = el.scrollWidth - el.clientWidth;
        setTimeout(() => {
          el.scrollTo({ left: scrollLeft, behavior: "smooth" });
        }, 500);
      }
    }

    setIsLoadingSubcategories(true);
    getSubcategories(categoryId)
      .then((data) => {
        setSubcategories(data);

        if (categoryChanged) {
          // Category changed - reset subcategory selection
          setSubcategoryId(null);
        } else if (isInitialLoad) {
          // Initial load - try to preserve initial subcategory if valid
          const initialSubId = initialSubcategoryIdRef.current;
          if (initialSubId && data.some((s) => s.id === initialSubId)) {
            setSubcategoryId(initialSubId);
          } else {
            setSubcategoryId(null);
          }
        }
        // If neither changed nor initial load, keep current subcategoryId state
      })
      .catch((error) => {
        console.error("Failed to load subcategories", error);
        setSubcategories([]);
      })
      .finally(() => {
        setIsLoadingSubcategories(false);
      });
  }, [categoryId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) return;

    // Convert local date string back to ISO for submission
    // We append the time from the original date if possible, or just start of day
    const submissionDate = new Date(date);
    if (!initialData?.date) {
      // If new transaction, use current time but selected date
      const now = new Date();
      submissionDate.setHours(
        now.getHours(),
        now.getMinutes(),
        now.getSeconds()
      );
    }

    onSubmit({
      type,
      amount: Number.parseFloat(amount),
      categoryId,
      subcategoryId: subcategoryId || null,
      note,
      date: submissionDate.toISOString(),
    });
  };

  // Get the selected category to pass its color to SubcategorySelector
  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-6 px-2 relative mb-[100px]")}
    >
      <div className="px-2 mb-10">
        <div className="gap-3 flex justify-center flex-col items-center max-w-sm mx-auto py-4">
          <input
            id="amount-input"
            type="number"
            pattern="^\d*\.?\d{0,2}$"
            inputMode="decimal"
            placeholder={t("transactions.amountPlaceholder")}
            value={amount}
            className="bg-[var(--card-bg-level-1)] px-3 py-2 rounded-lg outline-none w-full resize-none text-[28px] font-medium"
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="gap-3 flex justify-center flex-col items-center max-w-sm mx-auto">
          <textarea
            id="note-input"
            placeholder={t("transactions.notePlaceholder")}
            value={note}
            className="bg-[var(--card-bg-level-1)] px-3 py-2 rounded-lg outline-none w-full resize-none"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex gap-4 w-full justify-center flex-col items-center my-4 max-w-sm mx-auto">
          <input
            ref={dateInputRef}
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-[30px] px-2 bg-[var(--card-bg-level-1)] rounded-lg w-full"
            style={{ fontSize: "16px", fontWeight: "500" }}
            tabIndex={-1}
          />
        </div>
        <div
          className="flex flex-col items-center gap-1 relative"
          style={{ margin: "8px -16px", marginTop: "12px" }}
        >
          <div
            ref={categoryScrollRef}
            className="no-scrollbar"
            style={{
              width: "100%",
              height: "230px",
              overflowX: "auto",
              overflowY: "hidden",
              scrollSnapType: "x mandatory",
              scrollBehavior: "smooth",
              WebkitOverflowScrolling: "touch",
              display: "flex",
              flexDirection: "row",
              gap: 4,
            }}
            onScroll={() => {
              const el = categoryScrollRef.current;
              if (!el) return;
              const index = Math.round(el.scrollLeft / el.clientWidth);
              setActiveCategoryPanel(Math.min(index, 1));
            }}
          >
            <div
              style={{
                flex: "0 0 100%",
                width: "100%",
                minWidth: "100%",
                height: "230px",
                overflow: "hidden",
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
              }}
            >
              {categoriesLoading ? (
                <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm flex items-center justify-center">
                  <Spinner size="lg" />
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-0 text-gray-400 dark:text-gray-500">
                  {t("transactions.noCategories")}
                </div>
              ) : (
                <div className="max-w-sm mx-auto bg-[var(--background-level-1)] rounded-[32px] p-2 h-full">
                  <CategorySelector
                    categories={categories}
                    selectedId={categoryId}
                    onSelect={setCategoryId}
                  />
                </div>
              )}
            </div>
            <div
              style={{
                flex: "0 0 100%",
                width: "100%",
                minWidth: "100%",
                height: "230px",
                overflow: "hidden",
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
              }}
            >
              {categoryId &&
                (isLoadingSubcategories || subcategories.length > 0) && (
                  <div className="space-y-2 py-1">
                    {isLoadingSubcategories ? (
                      <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm flex items-center justify-center">
                        <Spinner size="lg" />
                      </div>
                    ) : (
                      <div className="max-w-sm mx-auto bg-[var(--background-level-1)] rounded-[32px] p-[5px] h-[220px]">
                        <SubcategorySelector
                          subcategories={subcategories}
                          selectedId={subcategoryId}
                          onSelect={setSubcategoryId}
                          categoryColor={selectedCategory?.color}
                        />
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 bottom-[8px] absolute">
            <span
              className="rounded-full transition-colors"
              style={{
                width: "8px",
                height: "8px",
                backgroundColor:
                  activeCategoryPanel === 0
                    ? selectedCategory?.color
                    : "var(--border-default)",
              }}
              aria-hidden
            />
            <span
              className="rounded-full transition-colors"
              style={{
                width: "8px",
                height: "8px",
                backgroundColor:
                  activeCategoryPanel === 1
                    ? selectedCategory?.color
                    : "var(--border-default)",
              }}
              aria-hidden
            />
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center">
        <Button
          type="submit"
          size="lg"
          disabled={!amount}
          style={{
            backgroundColor: amount ? "var(--accent-color)" : undefined,
            color: amount ? "#00f3ff" : "var(--border-default)",
          }}
        >
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
