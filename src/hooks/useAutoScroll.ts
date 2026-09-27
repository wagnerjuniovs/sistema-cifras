import { useEffect, type RefObject } from "react";
import { startAutoScroll } from "../utils/autoScroll";

function getScrollElement(target: RefObject<HTMLElement | null> | null): HTMLElement | null {
  return target?.current ?? (document.scrollingElement as HTMLElement | null);
}

export function useAutoScroll(
  target: RefObject<HTMLElement | null> | null,
  active: boolean,
  speed: number,
) {
  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const element = getScrollElement(target);
    return element ? startAutoScroll(element, speed) : undefined;
  }, [active, speed, target]);
}
