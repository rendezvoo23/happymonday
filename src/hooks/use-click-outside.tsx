import { useEffect, useRef, useState } from "react";

export const DEFAULT_IGNORE_CLASS = "ignore-onclick-outside";

type Callback<T extends Event = Event> = (event: T) => void;

type EventType = {
  [Key in keyof DocumentEventMap]: DocumentEventMap[Key] extends
    | MouseEvent
    | TouchEvent
    ? Key
    : never;
}[keyof DocumentEventMap];

export type Options = {
  disabled?: boolean;
  eventType?: EventType;
  excludeScrollbar?: boolean;
  ignoreClass?: string | string[];
};

const checkClass = (element: HTMLElement, className: string): boolean =>
  element.classList?.contains(className);

const hasIgnoreClass = (
  event: MouseEvent | Element | TouchEvent,
  ignoreClass: string | string[]
): boolean => {
  let element = (
    "target" in event ? event.target || event : event
  ) as HTMLElement | null;

  let hasIgnoreClass = false;

  while (element) {
    if (Array.isArray(ignoreClass)) {
      if (
        ignoreClass.some(
          (className) => element && checkClass(element, className)
        )
      )
        hasIgnoreClass = true;
    } else if (checkClass(element, ignoreClass)) {
      hasIgnoreClass = true;
    }

    element = element.parentElement;
  }

  return hasIgnoreClass;
};

const clickedOnScrollbar = (e: MouseEvent): boolean =>
  document.documentElement.clientWidth <= e.clientX ||
  document.documentElement.clientHeight <= e.clientY;

/**
 *
 * @param {Callback} callback Callback which is called on click
 * @param {Options} options Hook options
 * @param {boolean} [options.disabled] disable event
 * @param {string} [options.eventType] Mouse or Touch event type
 * @param {Boolean} [options.excludeScrollbar] listen browser scrollbar clicks
 * @param {string} [options.ignoreClass] class to ignore event call
 *
 * @example
 *
 *
 *   const [isOpen, setIsOpen] = useState(false);
 *   const ref = useOutsideClick(() => setIsOpen(false), {
 *     disabled: !isOpen
 *   });
 *
 *   <div>
 *     <span ref={ref}>Content here</span>
 *   </div>
 *
 */
export const useOutsideClick = <T extends Event>(
  callback: Callback<T>,
  options: Options = {}
): ((element: HTMLElement | null) => void) => {
  const {
    disabled,
    eventType = "mousedown",
    excludeScrollbar,
    ignoreClass = DEFAULT_IGNORE_CLASS,
  } = options;
  const [ref, setRef] = useState<HTMLElement | null>(null);
  const callbackRef = useRef(callback);
  const activeDocument: Document | null = ref?.ownerDocument || document;

  callbackRef.current = callback;

  useEffect(() => {
    if (!ref) return;

    const handler = (event: MouseEvent | TouchEvent) => {
      if (
        !hasIgnoreClass(event, ignoreClass) &&
        !(excludeScrollbar && clickedOnScrollbar(event as MouseEvent)) &&
        !ref.contains(event.target as Node) &&
        activeDocument.contains(event.target as Node)
      )
        callbackRef.current(event as unknown as T);
    };

    const removeEventListener = () => {
      activeDocument?.removeEventListener(eventType, handler);
    };

    if (disabled) {
      removeEventListener();
      return;
    }

    activeDocument?.addEventListener(eventType, handler);

    return () => removeEventListener();
  }, [ref, ignoreClass, excludeScrollbar, disabled, eventType]);

  return setRef;
};
