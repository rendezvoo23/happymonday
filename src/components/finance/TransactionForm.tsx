import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useDate } from "@/context/DateContext";
import { useCurrency } from "@/hooks/useCurrency";
import { getSubcategories, type Subcategory } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCategoryStore } from "@/stores/categoryStore";
import { CategoryId, TransactionType } from "@/types";
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
  const [type, setType] = useState<TransactionType>(
    initialData?.type || initialType
  );
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [categoryId, setCategoryId] = useState<CategoryId>(
    initialData?.categoryId || ""
  );
  const [subcategoryId, setSubcategoryId] = useState<string | null>(
    initialData?.subcategoryId || null
  );
  const [note, setNote] = useState(initialData?.note || "");
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(false);
  const previousCategoryIdRef = useRef<CategoryId | null>(null);
  const initialSubcategoryIdRef = useRef<string | null>(
    initialData?.subcategoryId || null
  );

  const { selectedDate } = useDate();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) return;

    onSubmit({
      type,
      amount: parseFloat(amount),
      categoryId,
      subcategoryId: subcategoryId || null,
      note,
      date: initialData?.date || selectedDate.toISOString(),
    });
  };

  // Reset category when type changes if current category is invalid for new type
  const handleTypeChange = (newType: string) => {
    const t = newType as TransactionType;
    setType(t);
    const validCategories =
      t === "expense" ? getExpenseCategories() : getIncomeCategories();
    if (
      validCategories.length > 0 &&
      !validCategories.find((c) => c.id === categoryId)
    ) {
      setCategoryId(validCategories[0].id);
    }
  };

  // Get the selected category to pass its color to SubcategorySelector
  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SegmentedControl
        options={[
          { value: "expense", label: "Expense" },
          { value: "income", label: "Income" },
        ]}
        value={type}
        onChange={handleTypeChange}
      />

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-500 ml-1">Amount</label>
        <div className="relative">
          {isSymbolPrefix && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-gray-400">
              {symbol}
            </span>
          )}
          <Input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={cn(
              "text-2xl font-semibold",
              isSymbolPrefix ? "pl-10" : "pr-10"
            )}
            autoFocus
          />
          {!isSymbolPrefix && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-gray-400">
              {symbol}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-500 ml-1">
          Category
        </label>
        {categoriesLoading ? (
          <div className="text-center py-8 text-gray-400">
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No categories available
          </div>
        ) : (
          <CategorySelector
            categories={categories}
            selectedId={categoryId}
            onSelect={setCategoryId}
          />
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-500 ml-1">
          Note (Optional)
        </label>
        <Input
          placeholder="What was this for?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {categoryId && (
        <div className="space-y-2">
          {isLoadingSubcategories ? (
            <div className="text-center py-4 text-gray-400 text-sm">
              Loading subcategories...
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

      <div className="pt-4 flex gap-3">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-[2]" disabled={!amount}>
          {initialData ? "Save Changes" : "Add Transaction"}
        </Button>
      </div>
    </form>
  );
}
