export interface FloatingMenuPosition {
  x: number;
  y: number;
}

export function getFloatingMenuPosition(trigger: HTMLElement, menuWidth: number, menuHeight: number): FloatingMenuPosition {
  const rect = trigger.getBoundingClientRect();

  let x = rect.right - menuWidth;
  x = Math.max(12, Math.min(x, window.innerWidth - menuWidth - 12));

  let y = rect.bottom + 8;
  if (y + menuHeight > window.innerHeight - 12) {
    y = Math.max(12, rect.top - menuHeight - 8);
  }

  return { x, y };
}
