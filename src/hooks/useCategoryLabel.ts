import { useTranslation } from "./useTranslation";

/**
 * Mapping from database category names to translation slugs
 */
const CATEGORY_NAME_TO_SLUG: Record<string, string> = {
  Health: "health",
  Other: "other",
  Entertainment: "entertainment",
  Salary: "salary",
  Transport: "transportation",
  Shopping: "shopping",
  Services: "services",
  "Food & Drink": "food_drink",
  Investment: "investment",
  Travel: "travel",
};

/**
 * Hook to get translated category labels
 */
export function useCategoryLabel() {
  const { t } = useTranslation();

  /**
   * Get translated category label from database category name
   * @param categoryName - Category name from database (e.g., "Food & Drink", "Transport")
   * @returns Translated category label or original name if no mapping exists
   */
  const getCategoryLabel = (
    categoryName: string | null | undefined
  ): string => {
    if (!categoryName) return "Unknown";

    // Map database name to slug
    const slug = CATEGORY_NAME_TO_SLUG[categoryName];

    // If mapping exists, return translation
    if (slug) {
      return t(`categories.${slug}`);
    }

    // Otherwise return the original name
    return categoryName;
  };

  return { getCategoryLabel };
}
