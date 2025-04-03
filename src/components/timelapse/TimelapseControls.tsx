import React from "react";

export interface TimelapseControlsProps {
  isCapturing: boolean;
  onStart: () => void;
  onStop: () => void;
}

const TimelapseControls: React.FC<TimelapseControlsProps> = ({
  isCapturing,
  onStart,
  onStop,
}) => {
  return (
    <div
      className="controls"
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "16px",
        marginTop: "20px",
        marginBottom: "30px",
      }}
    >
      {!isCapturing ? (
        <button
          onClick={onStart}
          style={{
            padding: "12px 24px",
            borderRadius: "4px",
            border: "none",
            backgroundColor: "#43b581",
            color: "#fff",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            minWidth: "160px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
          }}
        >
          <span style={{ fontSize: "18px" }}>⏺</span> 녹화 시작
        </button>
      ) : (
        <button
          onClick={onStop}
          style={{
            padding: "12px 24px",
            borderRadius: "4px",
            border: "none",
            backgroundColor: "#ed4245",
            color: "#fff",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            minWidth: "160px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
          }}
        >
          <span style={{ fontSize: "18px" }}>⏹</span> 녹화 중지
        </button>
      )}
    </div>
  );
};

export default TimelapseControls;
