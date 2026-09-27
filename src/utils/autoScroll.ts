/** Keep fractional progress without fighting touch gestures or native momentum. */
export function startAutoScroll(element: HTMLElement, speed: number) {
  const isDocument = element === document.scrollingElement;
  const events = isDocument ? document : element;
  let frame = 0;
  let lastTime = performance.now();
  let position = element.scrollTop;
  let writtenPosition = position;
  let touching = false;
  let resumeAt = 0;
  let boundsDirty = true;
  let maxScroll = 0;
  const previousBehavior = element.style.scrollBehavior;
  element.style.scrollBehavior = "auto";

  const resize = () => { boundsDirty = true; };
  const observer = new ResizeObserver(resize);
  observer.observe(element);
  if (isDocument) observer.observe(document.body);
  else if (element.firstElementChild) observer.observe(element.firstElementChild);
  window.addEventListener("resize", resize);

  const defer = () => {
    position = writtenPosition = element.scrollTop;
    resumeAt = performance.now() + 300;
  };
  const touchStart = () => { touching = true; defer(); };
  const touchEnd = () => { touching = false; defer(); };
  const scroll = () => {
    // Ignore our own scroll events, including browser pixel rounding.
    if (touching || Math.abs(element.scrollTop - writtenPosition) > 1) defer();
  };
  const visibility = () => { lastTime = performance.now(); defer(); };
  events.addEventListener("touchstart", touchStart, { passive: true });
  events.addEventListener("touchend", touchEnd, { passive: true });
  events.addEventListener("touchcancel", touchEnd, { passive: true });
  events.addEventListener("wheel", defer, { passive: true });
  events.addEventListener("scroll", scroll, { passive: true });
  document.addEventListener("visibilitychange", visibility);

  const tick = (time: number) => {
    const elapsed = Math.min(32, Math.max(0, time - lastTime));
    lastTime = time;
    if (!document.hidden && !touching && time >= resumeAt) {
      if (boundsDirty) {
        maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
        boundsDirty = false;
      }
      if (Math.abs(element.scrollTop - writtenPosition) > 1) defer();
      else {
        position = Math.min(maxScroll, Math.max(0, position + speed * elapsed / 1000));
        if (Math.abs(position - writtenPosition) >= 0.1 || (position === maxScroll && position !== writtenPosition)) {
          element.scrollTop = position;
          writtenPosition = element.scrollTop;
        }
      }
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener("resize", resize);
    events.removeEventListener("touchstart", touchStart);
    events.removeEventListener("touchend", touchEnd);
    events.removeEventListener("touchcancel", touchEnd);
    events.removeEventListener("wheel", defer);
    events.removeEventListener("scroll", scroll);
    document.removeEventListener("visibilitychange", visibility);
    element.style.scrollBehavior = previousBehavior;
  };
}
