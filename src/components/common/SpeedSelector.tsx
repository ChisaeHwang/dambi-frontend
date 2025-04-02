import React from "react";

interface SpeedSelectorProps {
  selectedSpeed: number;
  speedOptions: number[];
  onSpeedChange: (speed: number) => void;
}

const SpeedSelector: React.FC<SpeedSelectorProps> = ({
  selectedSpeed,
  speedOptions,
  onSpeedChange,
}) => {
  return (
    <div className="setting-section" style={{ marginBottom: "16px" }}>
      <h3
        style={{
          color: "#fff",
          fontSize: "16px",
          marginBottom: "8px",
        }}
      >
        타임랩스 배속
      </h3>
      <div
        className="speed-selector"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        {speedOptions.map((speed) => (
          <button
            key={speed}
            onClick={() => onSpeedChange(speed)}
            style={{
              padding: "8px 16px",
              borderRadius: "4px",
              border: "none",
              backgroundColor: selectedSpeed === speed ? "#5865f2" : "#4f545c",
              color: "#fff",
              cursor: "pointer",
              transition: "background-color 0.2s",
              fontSize: "14px",
              minWidth: "60px",
            }}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  );
};

export default SpeedSelector;
