import React from "react";

interface PlayerControlsProps {
  currentFrame: number;
  framesCount: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onFrameChange: (frameIndex: number) => void;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
  currentFrame,
  framesCount,
  isPlaying,
  onTogglePlay,
  onFrameChange,
}) => {
  const handleFrameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const frameIndex = parseInt(event.target.value, 10);
    onFrameChange(frameIndex);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <button
        onClick={onTogglePlay}
        className={`custom-button ${framesCount === 0 ? "secondary" : ""}`}
        disabled={framesCount === 0}
      >
        {isPlaying ? "일시정지" : "재생"}
      </button>

      <input
        type="range"
        min={0}
        max={framesCount > 0 ? framesCount - 1 : 0}
        value={currentFrame}
        onChange={handleFrameChange}
        disabled={framesCount === 0 || isPlaying}
        style={{
          flex: "1",
          height: "10px",
          borderRadius: "5px",
          backgroundColor: "var(--bg-tertiary)",
          accentColor: "var(--primary-color)",
        }}
      />

      <span style={{ minWidth: "70px", textAlign: "right" }}>
        {framesCount > 0 ? `${currentFrame + 1} / ${framesCount}` : "0 / 0"}
      </span>
    </div>
  );
};

export default PlayerControls;
