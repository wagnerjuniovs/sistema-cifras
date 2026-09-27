// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { startAutoScroll } from "./autoScroll";

let now = 0;
let nextFrame: FrameRequestCallback;
let element: HTMLDivElement;
let stop: (() => void) | undefined;
function advance(ms = 16) { now += ms; nextFrame(now); }

beforeEach(() => {
  now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  vi.stubGlobal("requestAnimationFrame", vi.fn((callback) => { nextFrame = callback; return 1; }));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  element = document.createElement("div");
  Object.defineProperties(element, { scrollHeight: { value: 2000 }, clientHeight: { value: 400 } });
});
afterEach(() => { stop?.(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("avança em frações de pixel, respeitando a velocidade", () => {
  stop = startAutoScroll(element, 8);
  advance();
  expect(element.scrollTop).toBeCloseTo(0.128);
  for (let i = 0; i < 59; i++) advance();
  expect(element.scrollTop).toBeCloseTo(7.68);
});

it("não disputa o toque nem a inércia; retoma da posição escolhida", () => {
  stop = startAutoScroll(element, 40);
  advance();
  element.dispatchEvent(new Event("touchstart"));
  const initial = element.scrollTop;
  for (let i = 0; i < 30; i++) advance();
  expect(element.scrollTop).toBe(initial);
  element.scrollTop = 300;
  element.dispatchEvent(new Event("touchend"));
  for (let i = 0; i < 15; i++) advance();
  element.scrollTop = 350;
  element.dispatchEvent(new Event("scroll"));
  for (let i = 0; i < 15; i++) advance();
  expect(element.scrollTop).toBe(350);
  for (let i = 0; i < 10; i++) advance();
  expect(element.scrollTop).toBeGreaterThan(350);
  expect(element.scrollTop).toBeLessThan(355);
});

it("evita saltos após frames atrasados e respeita o final da cifra", () => {
  element.scrollTop = 1598;
  stop = startAutoScroll(element, 40);
  advance(2000);
  expect(element.scrollTop).toBeCloseTo(1599.28);
  advance(); advance();
  expect(element.scrollTop).toBe(1600);
});

it("remove a animação e restaura o comportamento anterior ao pausar", () => {
  element.style.scrollBehavior = "smooth";
  stop = startAutoScroll(element, 40);
  expect(element.style.scrollBehavior).toBe("auto");
  stop();
  expect(element.style.scrollBehavior).toBe("smooth");
  expect(cancelAnimationFrame).toHaveBeenCalled();
});
