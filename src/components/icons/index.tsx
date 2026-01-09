import React from "react";
import { CarrotIcon } from "./carrot";
import { ForkIcon } from "./fork";
import { PlaneIcon } from "./plane";
import styles from "./styles.module.css";

export const Icons: Record<string, React.FC> = {
  ":carrot:": CarrotIcon,
  ":fork:": ForkIcon,
  ":plane:": PlaneIcon,
};

/**
 * Get the icon component for a given icon string (category or subcategory icon)
 * @param icon - The icon string (e.g., ":fork:")
 * @returns The React node (JSX) if found in Icons map, null otherwise
 */
export const getIconComponent = (
  icon: string | null | undefined
): React.ReactNode => {
  if (!icon) return null;
  const Component = Icons[icon] as React.FC | undefined;
  if (!Component) return null;

  return (
    <div className={styles.iconContainer}>
      <Component />
    </div>
  );
};
