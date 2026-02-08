import { MoreIcon } from "@/components/icons";
import { useOutsideClick } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";
import type React from "react";
import { memo, useEffect, useState } from "react";
import { LiquidButton } from "../button/button";

type InlineButtonDialogProps = {
  width?: number;
  height?: number;
  children?:
    | React.ReactNode
    | ((props: {
        setHeight: (height: number) => void;
        onClose?: () => void;
      }) => React.ReactNode);
  zIndex?: number;
  buttonSize?: number;
  title?: React.ReactNode;
  useOutsideClick?: boolean;
  showCloseButton?: boolean;
  "data-testid"?: string;
  expandedYOffset?: number;
};

export const InlineButtonDialog = memo(
  ({
    width = 320,
    height: _height = 250,
    zIndex = 1,
    buttonSize = 40,
    expandedYOffset = -8,
    showCloseButton = false,
    title,
    children,
    useOutsideClick: _useOutsideClick = true,
    "data-testid": dataTestId,
  }: InlineButtonDialogProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [height, setHeight] = useState(_height);

    const handleClose = () => {
      setIsExpanded(false);
    };

    // Close when user scrolls (if open)
    useEffect(() => {
      if (!isExpanded) return;
      const onScroll = () => handleClose();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }, [isExpanded]);

    const ref = useOutsideClick(
      () => {
        setIsExpanded(false);
      },
      {
        disabled: !isExpanded || !_useOutsideClick,
      }
    );

    const handleExpand = () => {
      setIsExpanded(true);
    };

    return (
      <div className="flex flex-row items-center">
        {title && (
          <div
            className="cursor-pointer"
            onClick={handleExpand}
            data-testid={dataTestId}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleExpand();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleExpand();
              }
            }}
            onMouseDown={(e) => {
              if (e.button === 0) {
                handleExpand();
              }
            }}
          >
            <h1
              data-text-emphasized
              style={{
                color: "#9900FF",
                margin: 0,
                padding: 0,
                lineHeight: "normal",
              }}
            >
              {title}
            </h1>
          </div>
        )}
        <div
          ref={ref}
          style={{
            position: "relative",
            width: buttonSize,
            height: buttonSize,
            minHeight: buttonSize,
            minWidth: buttonSize,
            margin: 0,
            padding: 0,
            boxSizing: "border-box",
          }}
          className="ignore-onclick-outside-none"
        >
          <motion.div
            layout
            variants={{
              initial: {
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonSize / 2,
                transition: {
                  type: "spring",
                  damping: 25,
                  stiffness: 500,
                  duration: 0.6,
                },
              },
              expanded: {
                width: width,
                height: height,
                x: -width + buttonSize + 0,
                y: expandedYOffset,
                borderRadius: 24,
                scale: 1,
                transition: {
                  type: "spring",
                  damping: 15,
                  stiffness: 300,
                  duration: 0.6,
                },
              },
            }}
            initial="initial"
            animate={isExpanded ? "expanded" : "initial"}
            whileTap={!isExpanded ? "tap" : undefined}
            onClick={!isExpanded ? handleExpand : undefined}
            className={cn(
              "relative overflow-hidden cursor-pointer",
              isExpanded
                ? "cursor-default shadow-xl bg-[var(--background-level-3)]"
                : ""
            )}
            style={{
              transformOrigin: "center",
              minWidth: buttonSize,
              minHeight: buttonSize,
              width: buttonSize,
              height: buttonSize,
              position: "absolute",
              backgroundColor: isExpanded
                ? "var(--background-level-3)"
                : "var(--background-level-2)",
              border: isExpanded
                ? "1px solid var(--border-level-2)"
                : "1px solid transparent",
              zIndex,
            }}
          >
            {!isExpanded && (
              <motion.div
                className="flex items-center justify-center"
                initial={{ opacity: 1 }}
                animate={{ opacity: isExpanded ? 0 : 1 }}
                transition={{ duration: 0.6 }}
                style={{
                  minWidth: buttonSize,
                  minHeight: buttonSize,
                }}
              >
                <div
                  style={{ width: buttonSize / 1.5, height: buttonSize / 1.5 }}
                >
                  <MoreIcon className="w-4 h-4 opacity-50" />
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {isExpanded && (
                <>
                  {showCloseButton && (
                    <motion.div
                      variants={{
                        hidden: {
                          opacity: 0,
                          scale: 0,
                          rotate: -90,
                        },
                        visible: {
                          opacity: 1,
                          scale: 1,
                          rotate: 0,
                          transition: {
                            delay: 0.3,
                            type: "spring",
                            damping: 15,
                            stiffness: 400,
                          },
                        },
                        tap: {
                          scale: 1.2,
                        },
                      }}
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      whileHover="hover"
                      whileTap="tap"
                      onClick={handleClose}
                      className="absolute top-3 left-3 z-10"
                    >
                      <LiquidButton
                        icon={<XIcon size={30} />}
                        onClick={handleClose}
                        variant="liquid"
                        size="icon-lg"
                      />
                    </motion.div>
                  )}

                  <motion.div
                    variants={{
                      hidden: {
                        opacity: 0,
                      },
                      visible: {
                        opacity: 1,
                        transition: {
                          delay: 0.4,
                          type: "spring",
                          damping: 20,
                          stiffness: 300,
                        },
                      },
                      exit: {
                        opacity: 0,
                        transition: {
                          duration: 0.2,
                        },
                      },
                    }}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="w-full h-full absolute"
                  >
                    <div className="w-full h-full">
                      <div
                        className={cn(
                          showCloseButton ? "px-5" : "px-0",
                          showCloseButton ? "mt-20" : "mt-0"
                        )}
                      >
                        {typeof children === "function"
                          ? children({ setHeight, onClose: handleClose })
                          : children}
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    );
  }
);
