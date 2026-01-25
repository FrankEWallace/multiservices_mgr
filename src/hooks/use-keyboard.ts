import { useEffect, useCallback } from "react";

interface UseKeyboardNavigationOptions {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: (shiftKey: boolean) => void;
  onDelete?: () => void;
  onBackspace?: () => void;
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * Hook for keyboard navigation
 */
export function useKeyboardNavigation({
  onEnter,
  onEscape,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onTab,
  onDelete,
  onBackspace,
  enabled = true,
  preventDefault = true,
}: UseKeyboardNavigationOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't handle if user is typing in an input
      const target = event.target as HTMLElement;
      const isInput = 
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Allow Escape to work even in inputs
      if (event.key === "Escape" && onEscape) {
        if (preventDefault) event.preventDefault();
        onEscape();
        return;
      }

      // Skip other shortcuts when typing
      if (isInput && event.key !== "Tab") return;

      switch (event.key) {
        case "Enter":
          if (onEnter) {
            if (preventDefault) event.preventDefault();
            onEnter();
          }
          break;
        case "ArrowUp":
          if (onArrowUp) {
            if (preventDefault) event.preventDefault();
            onArrowUp();
          }
          break;
        case "ArrowDown":
          if (onArrowDown) {
            if (preventDefault) event.preventDefault();
            onArrowDown();
          }
          break;
        case "ArrowLeft":
          if (onArrowLeft) {
            if (preventDefault) event.preventDefault();
            onArrowLeft();
          }
          break;
        case "ArrowRight":
          if (onArrowRight) {
            if (preventDefault) event.preventDefault();
            onArrowRight();
          }
          break;
        case "Tab":
          if (onTab) {
            if (preventDefault) event.preventDefault();
            onTab(event.shiftKey);
          }
          break;
        case "Delete":
          if (onDelete) {
            if (preventDefault) event.preventDefault();
            onDelete();
          }
          break;
        case "Backspace":
          if (onBackspace && !isInput) {
            if (preventDefault) event.preventDefault();
            onBackspace();
          }
          break;
      }
    },
    [
      enabled,
      onEnter,
      onEscape,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
      onTab,
      onDelete,
      onBackspace,
      preventDefault,
    ]
  );

  useEffect(() => {
    if (enabled) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [enabled, handleKeyDown]);
}

interface UseShortcutOptions {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  callback: () => void;
  enabled?: boolean;
}

/**
 * Hook for keyboard shortcuts
 */
export function useShortcut({
  key,
  ctrl = false,
  shift = false,
  alt = false,
  meta = false,
  callback,
  enabled = true,
}: UseShortcutOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        event.ctrlKey === ctrl &&
        event.shiftKey === shift &&
        event.altKey === alt &&
        event.metaKey === meta
      ) {
        // Don't trigger if typing in an input (unless it's Escape)
        const target = event.target as HTMLElement;
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        if (!isInput || key === "Escape") {
          event.preventDefault();
          callback();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [key, ctrl, shift, alt, meta, callback, enabled]);
}

/**
 * Hook for multiple keyboard shortcuts
 */
export function useShortcuts(
  shortcuts: Array<Omit<UseShortcutOptions, "enabled">>,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          event.ctrlKey === (shortcut.ctrl ?? false) &&
          event.shiftKey === (shortcut.shift ?? false) &&
          event.altKey === (shortcut.alt ?? false) &&
          event.metaKey === (shortcut.meta ?? false)
        ) {
          const target = event.target as HTMLElement;
          const isInput =
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable;

          if (!isInput || shortcut.key === "Escape") {
            event.preventDefault();
            shortcut.callback();
            return;
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts, enabled]);
}

/**
 * Hook for list navigation with arrow keys
 */
export function useListNavigation<T>({
  items,
  selectedIndex,
  onSelect,
  onConfirm,
  onCancel,
  enabled = true,
  loop = true,
}: {
  items: T[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onConfirm?: (item: T) => void;
  onCancel?: () => void;
  enabled?: boolean;
  loop?: boolean;
}) {
  useKeyboardNavigation({
    enabled,
    onArrowUp: () => {
      if (items.length === 0) return;
      const newIndex = selectedIndex > 0 
        ? selectedIndex - 1 
        : loop ? items.length - 1 : 0;
      onSelect(newIndex);
    },
    onArrowDown: () => {
      if (items.length === 0) return;
      const newIndex = selectedIndex < items.length - 1 
        ? selectedIndex + 1 
        : loop ? 0 : items.length - 1;
      onSelect(newIndex);
    },
    onEnter: () => {
      if (items.length > 0 && selectedIndex >= 0 && onConfirm) {
        onConfirm(items[selectedIndex]);
      }
    },
    onEscape: onCancel,
  });
}
