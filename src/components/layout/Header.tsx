import type { ReactNode } from "react";

interface HeaderProps {
  children: ReactNode;
  useFixedPosition?: boolean;
}

export function Header({ children, useFixedPosition = false }: HeaderProps) {
  return (
    <header
      className="flex flex-col items-center pb-5 mt-2"
      style={{
        zIndex: 1,
        position: useFixedPosition ? "fixed" : "sticky",
        top: "0",
        left: useFixedPosition ? "0" : undefined,
        right: useFixedPosition ? "0" : undefined,
        paddingTop:
          "calc(max(env(safe-area-inset-top), var(--tg-safe-area-inset-top, 0px)) + 8px)",
      }}
    >
      {/* Background blur layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          paddingTop:
            "max(env(safe-area-inset-top), var(--tg-safe-area-inset-top, 0px))",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          background:
            "linear-gradient(to bottom, color-mix(in srgb, var(--background) 40%, transparent) 50%, transparent)",
          maskImage:
            "linear-gradient(to bottom, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 0))",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 0))",
          zIndex: -1,
        }}
      />

      {children}
    </header>
  );
}
