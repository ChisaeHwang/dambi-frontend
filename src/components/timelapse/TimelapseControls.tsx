import React from "react";

interface TimelapseControlsProps {
  isCapturing: boolean;
  onStart: () => void;
  onStop: () => void;
}

const TimelapseControls: React.FC<TimelapseControlsProps> = ({
  isCapturing,
  onStart,
  onStop,
}) => (
  <div
    className="action-buttons"
    style={{
      display: "flex",
      justifyContent: "center",
      marginTop: "16px",
      marginBottom: "16px",
    }}
  >
    <button
      onClick={isCapturing ? onStop : onStart}
      style={{
        padding: "12px 24px",
        borderRadius: "4px",
        border: "none",
        backgroundColor: isCapturing ? "#ed4245" : "#5865f2",
        color: "#fff",
        cursor: "pointer",
        fontSize: "16px",
        fontWeight: "500",
        transition: "background-color 0.2s",
        width: "100%",
        maxWidth: "240px",
        minWidth: "180px",
      }}
    >
      {isCapturing ? "정지" : "시작"}
    </button>
  </div>
);

export default TimelapseControls;
