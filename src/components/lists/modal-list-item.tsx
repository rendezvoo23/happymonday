import { CheckmarkIcon } from "@/components/icons/checkmark";

export function ModalListItem({
  children,
  onClick,
  position = "single",
  isSelected = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  position?: "first" | "middle" | "last" | "single";
  isSelected?: boolean;
}) {
  const getRoundedClass = () => {
    switch (position) {
      case "first":
        return "rounded-t-2xl rounded-b-none";
      case "last":
        return "rounded-b-2xl rounded-t-none";
      case "middle":
        return "rounded-none";
      case "single":
        return "rounded-2xl";
      default:
        return "rounded-2xl";
    }
  };

  const showDivider = position === "first" || position === "middle";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 pl-12 py-3 bg-white dark:bg-[var(--background-level-1)] hover:bg-gray-50 dark:hover:bg-[var(--background-level-2)] transition-colors relative ${getRoundedClass()}`}
    >
      {isSelected && (
        <CheckmarkIcon className="w-5 h-5 text-[var(--accent-color)] flex-shrink-0 absolute left-4" />
      )}
      {children}

      {showDivider && (
        <div className="absolute bottom-0 left-10 right-0 h-px bg-gray-200 dark:bg-[var(--border-level-1)]" />
      )}
    </button>
  );
}
