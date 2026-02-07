import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";

import { NumericKeyboard } from "@/components/ui/NumericKeyboard";
import { useDate } from "@/context/DateContext";
import { useCurrency } from "@/hooks/useCurrency";
import { useTranslation } from "@/hooks/useTranslation";
import { type Subcategory, getSubcategories } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCategoryStore } from "@/stores/categoryStore";
import type { CategoryId, TransactionType } from "@/types";
import { motion } from "framer-motion";
import { CheckIcon, X } from "lucide-react";
import { Spinner } from "../spinner";
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
  showEditNote?: boolean;
}

export function TransactionForm({
  onSubmit,
  initialData,
  initialType = "expense",
  showEditNote = true,
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
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(true);

  const { formatAmount } = useCurrency();
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
    <form
      onSubmit={handleSubmit}
      className={cn(
        "space-y-6 px-2 safe-area-bottom relative",
        showEditNote && "mb-[100px]"
      )}
    >
      <div className="space-y-4">
        {/* Amount Display */}

        <div
          className={cn(
            "mx-[36px] relative flex items-center justify-center h-[50px] rounded-full px-6 py-0 mt-2",
            isKeyboardVisible && "bg-[rgba(0,0,0,0.1)]"
          )}
          onClick={() => setIsKeyboardVisible((prev) => !prev)}
          onKeyUp={(e) => {
            if (e.key === "Enter") {
              setIsKeyboardVisible((prev) => !prev);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setIsKeyboardVisible((prev) => !prev);
            }
          }}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              setIsKeyboardVisible((prev) => !prev);
            }
          }}
          onTouchEnd={() => {
            setIsKeyboardVisible((prev) => !prev);
          }}
          onTouchStart={() => {
            setIsKeyboardVisible((prev) => !prev);
          }}
          onTouchMove={() => {
            setIsKeyboardVisible((prev) => !prev);
          }}
          onTouchCancel={() => {
            setIsKeyboardVisible((prev) => !prev);
          }}
        >
          <div
            className={cn(
              "flex items-center gap-0",
              Number.parseFloat(amount ?? "0") > 1_000_000
                ? "text-[30px]"
                : "text-[36px]"
            )}
          >
            <span className={amount ? "" : "opacity-70"}>
              {amount
                ? formatAmount(Number.parseFloat(amount ?? "0"), {
                    hideFractions: false,
                    forceDecimal: amount.includes("."),
                  })
                : formatAmount(0, {
                    hideFractions: false,
                  })}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 w-full justify-center items-center mt-8">
        <div>
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
        <input
          ref={dateInputRef}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-transparent h-[30px] px-2 bg-[var(--border-level-2)] rounded-full"
          style={{ fontSize: "14px" }}
          tabIndex={-1}
        />
      </div>

      {showEditNote && (
        <div className="gap-3 flex justify-center flex-col items-center max-w-sm mx-auto mb-8 mt-8">
          <textarea
            id="note-input"
            placeholder={t("transactions.notePlaceholder")}
            value={note}
            className="bg-[var(--border-level-1)] px-3 py-2 rounded-lg outline-none w-full resize-none"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}

      {selectedType === "transactions.category" && (
        <div
          style={{
            height: "200px",
            overflow: "hidden",
          }}
        >
          {categoriesLoading ? (
            <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm flex items-center justify-center min-h-[200px]">
              <Spinner size="lg" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-0 text-gray-400 dark:text-gray-500">
              {t("transactions.noCategories")}
            </div>
          ) : (
            <div className="max-w-sm mx-auto">
              <CategorySelector
                categories={categories}
                selectedId={categoryId}
                onSelect={setCategoryId}
              />
            </div>
          )}
        </div>
      )}

      {selectedType === "transactions.subcategory" && (
        <div
          style={{
            height: "200px",
          }}
        >
          {categoryId &&
            (isLoadingSubcategories || subcategories.length > 0) && (
              <div className="space-y-2 py-1">
                {isLoadingSubcategories ? (
                  <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm flex items-center justify-center min-h-[200px]">
                    <Spinner size="lg" />
                  </div>
                ) : (
                  <div className="max-w-sm mx-auto">
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
      )}

      {/* Virtual Keyboard */}
      {isKeyboardVisible && (
        <motion.div
          className="flex justify-center items-center max-w-sm mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <NumericKeyboard
            onKeyPress={handleKeyPress}
            onBackspace={handleBackspace}
          />
        </motion.div>
      )}

      <LiquidButton
        type="button"
        variant="liquid"
        size="icon-lg"
        onClick={onCancel}
        style={{
          position: "absolute",
          left: "-4px",
          top: "-20px",
          zIndex: 1,
        }}
      >
        <X className="w-5 h-5" />
      </LiquidButton>

      <LiquidButton
        type="submit"
        variant={amount ? "liquid" : "outline"}
        size="icon-lg"
        onClick={onCancel}
        disabled={!amount}
        className="safe-area-top"
        style={{
          backgroundColor: amount ? "var(--accent-color)" : undefined,
          color: amount ? "white" : "var(--border-default)",
          position: "absolute",
          right: "-4px",
          top: "-20px",
          zIndex: 1,
        }}
      >
        <CheckIcon />
      </LiquidButton>
    </form>
  );
}
