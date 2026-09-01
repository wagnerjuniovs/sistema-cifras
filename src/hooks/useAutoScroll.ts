import { useEffect, type RefObject } from "react";

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

    let frame = 0;
    let lastTime = performance.now();

    const tick = (time: number) => {
      const element = getScrollElement(target);

      if (element) {
        const delta = time - lastTime;
        const maxScroll = element.scrollHeight - element.clientHeight;
        element.scrollTop = Math.min(maxScroll, element.scrollTop + (speed * delta) / 1000);
      }

      lastTime = time;
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [active, speed, target]);
}
