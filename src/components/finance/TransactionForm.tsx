import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NumericKeyboard } from "@/components/ui/NumericKeyboard";
import { useDate } from "@/context/DateContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslation } from "@/hooks/useTranslation";
import { type Subcategory, getSubcategories } from "@/lib/api";
import { useCategoryStore } from "@/stores/categoryStore";
import type { CategoryId, TransactionType } from "@/types";
import { Loader2, X } from "lucide-react";
import { SegmentedControl } from "../ui/SegmentedControl";
import { LiquidButton } from "../ui/button/button";
import { CategorySelector } from "./CategorySelector";
import { SubcategorySelector } from "./SubcategorySelector";

interface TransactionFormProps {
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
  onCancel: () => void;
}

export function TransactionForm({
  onSubmit,
  initialData,
  initialType = "expense",
  onCancel,
}: TransactionFormProps) {
  const { selectedDate } = useDate();
  const { t } = useTranslation();

  const [type] = useState<TransactionType>(initialData?.type || initialType);
  const [selectedType, setSelectedType] = useState<
    "transactions.category" | "transactions.subcategory"
  >("transactions.category");
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
      ? format(new Date(initialData.date), "yyyy-MM-dd")
      : format(selectedDate, "yyyy-MM-dd")
  );

  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false);
  const previousCategoryIdRef = useRef<CategoryId | null>(null);
  const initialSubcategoryIdRef = useRef<string | null>(
    initialData?.subcategoryId || null
  );

  const { symbol, isSymbolPrefix } = useCurrency();
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
      setCategoryId(categories[0].id);
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

  const handleKeyPress = (key: string) => {
    if (key === ".") {
      // Only allow one decimal point
      if (amount.includes(".")) return;
      // If empty, start with "0."
      if (amount === "") {
        setAmount("0.");
        return;
      }
    }

    // Prevent multiple leading zeros
    if (amount === "0" && key !== ".") {
      setAmount(key);
      return;
    }

    // Limit to 2 decimal places
    if (amount.includes(".")) {
      const [, decimals] = amount.split(".");
      if (decimals && decimals.length >= 2) return;
    }

    // Limit total length
    if (amount.length >= 10) return;

    setAmount(amount + key);
  };

  const handleBackspace = () => {
    setAmount(amount.slice(0, -1));
  };

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Amount Display */}

        <div className="absolute right-4 top-[14px]">
          <Input
            id="date-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="relative flex items-center justify-center min-h-[64px] rounded-2xl px-6 py-4 mt-10">
          <div className="flex items-center gap-2 text-2xl">
            {isSymbolPrefix && (
              <span className="text-gray-400 dark:text-gray-500">{symbol}</span>
            )}
            <span className={amount ? "" : "text-gray-400 dark:text-gray-600"}>
              {amount || "0"}
            </span>
            {!isSymbolPrefix && (
              <span className="text-gray-400 dark:text-gray-500">{symbol}</span>
            )}
          </div>
        </div>

        {/* Virtual Keyboard */}
        <NumericKeyboard
          onKeyPress={handleKeyPress}
          onBackspace={handleBackspace}
        />
      </div>

      <div className="flex justify-center">
        <SegmentedControl
          layoutId="segmented-control-category-subcategory"
          options={["transactions.category", "transactions.subcategory"].map(
            (cat) => ({
              value: cat,
              label: t(cat),
            })
          )}
          value={selectedType}
          onChange={(value) =>
            setSelectedType(
              value as unknown as
                | "transactions.category"
                | "transactions.subcategory"
            )
          }
        />
      </div>

      {selectedType === "transactions.category" && (
        <div className="space-y-1">
          {categoriesLoading ? (
            <div className="text-center py-0 text-gray-400 dark:text-gray-500 flex items-center justify-center h-[200px]">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-0 text-gray-400 dark:text-gray-500">
              {t("transactions.noCategories")}
            </div>
          ) : (
            <CategorySelector
              categories={categories}
              selectedId={categoryId}
              onSelect={setCategoryId}
            />
          )}
        </div>
      )}

      {selectedType === "transactions.subcategory" && (
        <div className="min-h-[200px]">
          {categoryId &&
            (isLoadingSubcategories || subcategories.length > 0) && (
              <div className="space-y-2 py-1">
                {isLoadingSubcategories ? (
                  <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm min-h-[200px] flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <SubcategorySelector
                    subcategories={subcategories}
                    selectedId={subcategoryId}
                    onSelect={setSubcategoryId}
                    categoryColor={selectedCategory?.color}
                  />
                )}
              </div>
            )}
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="note-input"
          className="text-sm font-medium text-gray-500 dark:text-gray-400 ml-1"
        >
          {t("transactions.noteOptional")}
        </label>
        <Input
          id="note-input"
          placeholder={t("transactions.notePlaceholder")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="pt-4 pb-4 flex gap-3">
        <LiquidButton
          type="button"
          variant="liquid"
          size="icon-lg"
          onClick={onCancel}
          className="absolute left-4 top-[14px]"
        >
          <X className="w-5 h-5" />
        </LiquidButton>
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={onCancel}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          className="flex-[2]"
          disabled={!amount}
          style={{ backgroundColor: "var(--accent-color)", color: "white" }}
        >
          {initialData ? t("common.saveChanges") : t("common.add")}
        </Button>
      </div>
    </form>
  );
}
