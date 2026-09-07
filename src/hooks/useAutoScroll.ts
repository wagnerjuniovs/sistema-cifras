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
    let remainder = 0;

    const tick = (time: number) => {
      const element = getScrollElement(target);

      if (element) {
        const delta = Math.min(100, time - lastTime);
        const maxScroll = element.scrollHeight - element.clientHeight;
        remainder += (speed * delta) / 1000;
        const step = Math.floor(remainder);
        remainder -= step;
        element.scrollTop = Math.min(Math.max(0, maxScroll), element.scrollTop + step);
      }

      lastTime = time;
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [active, speed, target]);
}
