import { useEffect, useRef, useState } from "react";
import { Minimize2, Minus, Plus } from "lucide-react";
import { AutoScrollControls } from "./AutoScrollControls";
import { ChordText } from "./ChordText";
import { useAutoScroll } from "../hooks/useAutoScroll";

import type { SongDoc } from "../types";
import { calculatePresentationLayout } from "../utils/layout";

interface PresentationModeProps {
  song: SongDoc;
  activeScroll: boolean;
  speed: number;
  onActiveScrollChange: (active: boolean) => void;
  onExit: () => void;
  onSpeedChange: (speed: number) => void;
}

export function PresentationMode({
  song,
  activeScroll,
  speed,
  onActiveScrollChange,
  onExit,
  onSpeedChange,
}: PresentationModeProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const requestedFullscreenRef = useRef(false);
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fontOffset, setFontOffset] = useState(0);
  const [allowColumns, setAllowColumns] = useState(true);
  const [layout, setLayout] = useState(() => calculatePresentationLayout(song.content, 800, 600));
  useEffect(() => {
    const stage = scrollRef.current;
    if (!stage) return;
    let frame = 0;
    let disposed = false;
    const probe = document.createElement("pre");
    probe.className = "presentation-block presentation-measure";
    shellRef.current?.append(probe);
    const measure = () => {
      if (disposed) return;
      const style = getComputedStyle(stage);
      const width = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const height = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const next = calculatePresentationLayout(song.content, Math.max(1, width), Math.max(1, height), fontOffset,
        (lines, font, blockWidth) => {
          probe.style.fontSize = font + "px";
          probe.style.lineHeight = font * 1.35 + "px";
          probe.style.width = blockWidth === undefined ? "max-content" : blockWidth + "px";
          probe.textContent = lines.join("\n") + "\n";
          const rect = probe.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }, allowColumns);
      setLayout((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    const schedule = () => { if (disposed) return; cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(stage);
    if (shellRef.current) observer.observe(shellRef.current);
    document.addEventListener("fullscreenchange", schedule);
    window.addEventListener("orientationchange", schedule);
    document.fonts.addEventListener("loadingdone", schedule);
    void document.fonts.ready.then(schedule);
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("fullscreenchange", schedule);
      window.removeEventListener("orientationchange", schedule);
      document.fonts.removeEventListener("loadingdone", schedule);
      probe.remove();
    };
  }, [song.content, fontOffset, allowColumns]);

  useAutoScroll(scrollRef, activeScroll, speed);

  useEffect(() => {
    const node = shellRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    scrollRef.current?.focus();

    if (node?.requestFullscreen) {
      node
        .requestFullscreen()
        .then(() => {
          requestedFullscreenRef.current = true;
        })
        .catch(() => {
          requestedFullscreenRef.current = false;
        });
    }

    const handleFullscreenChange = () => {
      if (requestedFullscreenRef.current && !document.fullscreenElement) {
        onExitRef.current();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    let timer = 0;

    const reveal = (event?: Event) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        onExitRef.current();
        return;
      }

      setControlsVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { if (!shellRef.current?.contains(document.activeElement)) setControlsVisible(false); }, 3200);
    };

    reveal();
    window.addEventListener("mousemove", reveal);
    window.addEventListener("mousedown", reveal);
    window.addEventListener("touchstart", reveal, { passive: true });
    window.addEventListener("keydown", reveal);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", reveal);
      window.removeEventListener("mousedown", reveal);
      window.removeEventListener("touchstart", reveal);
      window.removeEventListener("keydown", reveal);
    };
  }, []);

  return (
    <div className="presentation-shell" ref={shellRef}>
      <div className="presentation-stage" ref={scrollRef} tabIndex={0} aria-label="Cifra em tela cheia">
        <div className="presentation-columns" style={{
          gap: layout.gap + "px", gridTemplateColumns: `repeat(${layout.columnCount}, minmax(0, 1fr))`,
          fontSize: layout.fontSize + "px", lineHeight: layout.lineHeight + "px",
        }}>
          {layout.blocks.map((column, index) => <div className="presentation-column" key={index}>
            {column.map((block) => <pre className="presentation-block" data-block-id={block.id} key={block.id}>
              <ChordText content={block.lines.join("\n")} />{"\n"}
            </pre>)}
          </div>)}
        </div>
      </div>

      <div
        className={controlsVisible ? "presentation-controls visible no-print" : "presentation-controls no-print"}
      >
        <div className="presentation-title">
          <strong>{song.title}</strong>
          <span>{song.artist || "Sem cantor"}</span>
        </div>
        <div className="presentation-actions">
          {(
            <div className="font-controls" aria-label="Tamanho da fonte">
              <button
                aria-label="Diminuir fonte"
                className="icon-button"
                onClick={() => setFontOffset((current) => Math.max(current - 1, -6))}
                type="button"
              >
                <Minus aria-hidden="true" size={18} />
              </button>
              <span>Aa</span>
              <button
                aria-label="Aumentar fonte"
                className="icon-button"
                onClick={() => setFontOffset((current) => Math.min(current + 1, 8))}
                type="button"
              >
                <Plus aria-hidden="true" size={18} />
              </button>
            </div>
          )}
          <button type="button" className="secondary-button" aria-pressed={allowColumns} onClick={() => setAllowColumns((value) => !value)}>Colunas</button>
          <AutoScrollControls
            active={activeScroll}
            compact
            onActiveChange={onActiveScrollChange}
            onSpeedChange={onSpeedChange}
            speed={speed}
          />
          <button aria-label="Sair da tela cheia" className="icon-button" onClick={onExit} type="button">
            <Minimize2 aria-hidden="true" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
