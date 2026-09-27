import { useEffect, useRef, useState } from "react";
import { Minimize2, Minus, Plus, SlidersHorizontal } from "lucide-react";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontOffset, setFontOffset] = useState(0);
  const [allowColumns, setAllowColumns] = useState(true);
  const [layout, setLayout] = useState(() => calculatePresentationLayout(song.content, 800, 600));
  useEffect(() => {
    const stage = scrollRef.current;
    if (!stage) return;
    let frame = 0;
    let lastSize = "";
    let disposed = false;
    const probe = document.createElement("pre");
    probe.className = "presentation-block presentation-measure";
    shellRef.current?.append(probe);
    const measure = () => {
      if (disposed) return;
      const style = getComputedStyle(stage);
      const width = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const height = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      const size = `${width}:${height}`;
      if (size === lastSize) return;
      lastSize = size;
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
    const fontsChanged = () => { lastSize = ""; schedule(); };
    const observer = new ResizeObserver(schedule);
    observer.observe(stage);
    if (shellRef.current) observer.observe(shellRef.current);
    document.addEventListener("fullscreenchange", schedule);
    window.addEventListener("orientationchange", schedule);
    document.fonts.addEventListener("loadingdone", fontsChanged);
    void document.fonts.ready.then(fontsChanged);
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("fullscreenchange", schedule);
      window.removeEventListener("orientationchange", schedule);
      document.fonts.removeEventListener("loadingdone", fontsChanged);
      probe.remove();
    };
  }, [song.content, fontOffset, allowColumns]);

  useAutoScroll(scrollRef, activeScroll, speed);

  useEffect(() => {
    const node = shellRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    scrollRef.current?.focus({ preventScroll: true });

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
      document.documentElement.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onExitRef.current();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
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

      <footer className="presentation-controls no-print" aria-label="Controles da apresentação">
        <div className="presentation-bar">
        <div className="presentation-title">
          <strong title={song.title}>{song.title}</strong>
          <span>{song.artist || "Sem cantor"}</span>
        </div>
        <div className="presentation-actions">
          <AutoScrollControls
            active={activeScroll}
            compact
            onActiveChange={onActiveScrollChange}
            onSpeedChange={onSpeedChange}
            speed={speed}
          />
          <button aria-label="Ajustes da apresentação" title="Fonte e colunas" aria-expanded={settingsOpen}
            aria-controls="presentation-settings" className="icon-button" type="button"
            onClick={() => setSettingsOpen((open) => !open)}>
            <SlidersHorizontal aria-hidden="true" size={18} />
          </button>
          <button aria-label="Sair da tela cheia" title="Sair da tela cheia" className="icon-button" onClick={onExit} type="button">
            <Minimize2 aria-hidden="true" size={18} />
          </button>
        </div>
        </div>
        {settingsOpen ? <div className="presentation-settings" id="presentation-settings">
            <div className="font-controls" aria-label="Tamanho da fonte">
              <button
                aria-label="Diminuir fonte"
                className="icon-button"
                onClick={() => setFontOffset((current) => Math.max(current - 1, -6))}
                type="button"
              >
                <Minus aria-hidden="true" size={18} />
              </button>
              <span>Fonte</span>
              <button
                aria-label="Aumentar fonte"
                className="icon-button"
                onClick={() => setFontOffset((current) => Math.min(current + 1, 8))}
                type="button"
              >
                <Plus aria-hidden="true" size={18} />
              </button>
            </div>
          <button type="button" className="secondary-button" aria-pressed={allowColumns} onClick={() => setAllowColumns((value) => !value)}>Colunas</button>
        </div> : null}
      </footer>
    </div>
  );
}
