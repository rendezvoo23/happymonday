/**
 * Theme System Example Component
 *
 * Demonstrates the GitHub-inspired dark theme with background levels.
 * Shows all card elevation levels and canvas backgrounds.
 * This component can be deleted - it's only for reference.
 */

import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ThemeExample() {
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
            Theme System Example
          </h1>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Theme System Demo
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            GitHub-inspired dark theme with layered backgrounds
          </p>
        </div>

        {/* Canvas Backgrounds */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Canvas Backgrounds
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-canvas-default border border-border-default rounded-xl p-6 space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Canvas Default
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Main page background
              </p>
              <code className="text-xs bg-canvas-inset px-2 py-1 rounded block">
                bg-canvas-default
              </code>
            </div>

            <div className="bg-canvas-subtle border border-border-default rounded-xl p-6 space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Canvas Subtle
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Elevated sections
              </p>
              <code className="text-xs bg-canvas-inset px-2 py-1 rounded block">
                bg-canvas-subtle
              </code>
            </div>

            <div className="bg-canvas-inset border border-border-default rounded-xl p-6 space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Canvas Inset
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sunken areas
              </p>
              <code className="text-xs bg-canvas-default px-2 py-1 rounded block">
                bg-canvas-inset
              </code>
            </div>
          </div>
        </section>

        {/* Card Levels */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Card Elevation Levels
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Level 0 */}
            <div className="card-level-0 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Level 0
                </h3>
                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                  Base
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Lowest elevation. Use for list items and base cards.
              </p>
              <code className="text-xs bg-canvas-inset px-2 py-1 rounded block">
                card-level-0
              </code>
            </div>

            {/* Level 1 */}
            <div className="card-level-1 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Level 1
                </h3>
                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                  Standard
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Standard elevation. Use for content cards and containers.
              </p>
              <code className="text-xs bg-canvas-inset px-2 py-1 rounded block">
                card-level-1
              </code>
            </div>

            {/* Level 2 */}
            <div className="card-level-2 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Level 2
                </h3>
                <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded">
                  Elevated
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Higher elevation. Use for important cards and modals.
              </p>
              <code className="text-xs bg-canvas-inset px-2 py-1 rounded block">
                card-level-2
              </code>
            </div>

            {/* Level 3 */}
            <div className="card-level-3 rounded-xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Level 3
                </h3>
                <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded">
                  Highest
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Highest elevation. Use for floating elements and tooltips.
              </p>
              <code className="text-xs bg-canvas-inset px-2 py-1 rounded block">
                card-level-3
              </code>
            </div>
          </div>
        </section>

        {/* Practical Example - Transaction List */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Practical Example: Transaction List
          </h2>

          <div className="card-level-1 rounded-2xl p-6 space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Recent Transactions
            </h3>

            <div className="space-y-2">
              {[
                {
                  id: "1",
                  name: "Coffee Shop",
                  amount: "-$4.50",
                  category: "Food",
                },
                {
                  id: "2",
                  name: "Salary",
                  amount: "+$3,500",
                  category: "Income",
                },
                {
                  id: "3",
                  name: "Uber",
                  amount: "-$12.30",
                  category: "Transport",
                },
                {
                  id: "4",
                  name: "Groceries",
                  amount: "-$67.80",
                  category: "Food",
                },
              ].map((transaction) => (
                <div
                  key={transaction.id}
                  className="card-level-0 rounded-xl p-4 flex items-center justify-between hover:card-level-1 transition-all cursor-pointer"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {transaction.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {transaction.category}
                    </p>
                  </div>
                  <span
                    className={`font-semibold ${
                      transaction.amount.startsWith("+")
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {transaction.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Practical Example - Settings Panel */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Practical Example: Settings Panel
          </h2>

          <div className="card-level-2 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Settings
            </h3>

            <div className="space-y-2">
              {[
                { id: "1", label: "Dark Mode", value: "System" },
                { id: "2", label: "Language", value: "English" },
                { id: "3", label: "Currency", value: "USD ($)" },
                { id: "4", label: "Notifications", value: "Enabled" },
              ].map((setting) => (
                <div
                  key={setting.id}
                  className="card-level-1 rounded-xl p-4 flex items-center justify-between"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {setting.label}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {setting.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Modal Example */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Practical Example: Modal
          </h2>

          <div className="relative h-64 bg-canvas-inset rounded-2xl overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

            <div className="card-level-3 rounded-3xl p-8 max-w-sm relative z-10 space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Confirm Action
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to delete this transaction? This action
                cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="card-level-1 rounded-lg px-4 py-2 text-gray-900 dark:text-gray-100 flex-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="bg-red-500 text-white rounded-lg px-4 py-2 flex-1"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Color Reference */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Border Colors
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card-level-1 rounded-xl p-6 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Subtle Border
              </h3>
              <div className="border-2 border-border-subtle rounded-lg p-4 text-center text-sm text-gray-600 dark:text-gray-400">
                border-border-subtle
              </div>
            </div>

            <div className="card-level-1 rounded-xl p-6 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Default Border
              </h3>
              <div className="border-2 border-border-default rounded-lg p-4 text-center text-sm text-gray-600 dark:text-gray-400">
                border-border-default
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
