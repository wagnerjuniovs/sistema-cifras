import { useEffect, useMemo, useRef, useState } from "react";
import { Minimize2, Minus, Plus } from "lucide-react";
import { AutoScrollControls } from "./AutoScrollControls";
import { ChordText } from "./ChordText";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { useWindowSize } from "../hooks/useWindowSize";
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
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fontOffset, setFontOffset] = useState(0);
  const size = useWindowSize();
  const desktopLayout = size.width >= 820 && size.height >= 520;
  const layout = useMemo(
    () => calculatePresentationLayout(song.content, size.width, size.height, fontOffset),
    [fontOffset, size.height, size.width, song.content],
  );

  useAutoScroll(scrollRef, activeScroll, speed);

  useEffect(() => {
    const node = shellRef.current;

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
        onExit();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [onExit]);

  useEffect(() => {
    let timer = 0;

    const reveal = (event?: Event) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        onExit();
        return;
      }

      setControlsVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setControlsVisible(false), 3200);
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
  }, [onExit]);

  return (
    <div className="presentation-shell" ref={shellRef}>
      <div
        className={
          desktopLayout
            ? layout.needsScroll
              ? "presentation-stage needs-scroll"
              : "presentation-stage"
            : "presentation-stage mobile-presentation"
        }
        ref={scrollRef}
      >
        {desktopLayout ? (
          <div
            className="presentation-columns"
            style={{
              gap: `${layout.gap}px`,
              gridTemplateColumns: `repeat(${layout.columnCount}, minmax(0, 1fr))`,
              fontSize: `${layout.fontSize}px`,
              lineHeight: `${layout.lineHeight}px`,
            }}
          >
            {layout.columns.map((column, index) => (
              <pre className="presentation-column" key={`${song.id}-${index}`}>
                <ChordText content={column.join("\n")} />
              </pre>
            ))}
          </div>
        ) : (
          <pre className="presentation-mobile-text">
            <ChordText content={song.content} />
          </pre>
        )}
      </div>

      <div
        className={controlsVisible ? "presentation-controls visible no-print" : "presentation-controls no-print"}
      >
        <div className="presentation-title">
          <strong>{song.title}</strong>
          <span>{song.artist || "Sem cantor"}</span>
        </div>
        <div className="presentation-actions">
          {desktopLayout ? (
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
          ) : null}
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
