import { Minus, Pause, Play, Plus } from "lucide-react";

interface AutoScrollControlsProps {
  active: boolean;
  speed: number;
  onActiveChange: (active: boolean) => void;
  onSpeedChange: (speed: number) => void;
  compact?: boolean;
}

const MIN_SPEED = 8;
const MAX_SPEED = 150;
const SPEED_STEP = 8;

function clamp(value: number): number {
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
}

export function AutoScrollControls({
  active,
  speed,
  onActiveChange,
  onSpeedChange,
  compact = false,
}: AutoScrollControlsProps) {
  const decrease = () => onSpeedChange(clamp(speed - SPEED_STEP));
  const increase = () => onSpeedChange(clamp(speed + SPEED_STEP));

  return (
    <div className={compact ? "autoscroll-controls compact" : "autoscroll-controls"}>
      <button
        aria-label={active ? "Pausar rolagem automática" : "Iniciar rolagem automática"}
        className={active ? "primary-button icon-label" : "secondary-button icon-label"}
        onClick={() => onActiveChange(!active)}
        type="button"
      >
        {active ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}
        {active ? "Pausar" : "Iniciar"}
      </button>
      <button aria-label="Diminuir velocidade" className="icon-button" onClick={decrease} type="button">
        <Minus aria-hidden="true" size={18} />
      </button>
      <label className="speed-slider">
        <span>Velocidade</span>
        <input
          max={MAX_SPEED}
          min={MIN_SPEED}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          step={1}
          type="range"
          value={speed}
        />
      </label>
      <button aria-label="Aumentar velocidade" className="icon-button" onClick={increase} type="button">
        <Plus aria-hidden="true" size={18} />
      </button>
      <span aria-live="polite" className="speed-readout">
        {Math.round(speed)}
      </span>
    </div>
  );
}
