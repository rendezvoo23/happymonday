export type TransactionType = "expense" | "income";

export type CategoryId =
  | "food_drink"
  | "shopping"
  | "travel"
  | "transportation"
  | "services"
  | "entertainment"
  | "health"
  | "salary"
  | "investment"
  | "other"
  | (string & {});

export interface Category {
  id: CategoryId;
  label: string;
  color: string; // Hex code
  icon?: string; // Optional icon name
  type: TransactionType | "both";
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: CategoryId;
  date: string; // ISO string
  note?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  joinDate: string;
  avatarUrl?: string;
}
