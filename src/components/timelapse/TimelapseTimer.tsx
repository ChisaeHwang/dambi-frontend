import React from "react";

export interface TimelapseTimerProps {
  formattedTime: string;
}

const TimelapseTimer: React.FC<TimelapseTimerProps> = ({ formattedTime }) => {
  return (
    <div
      className="timer-section"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: "20px",
        marginTop: "20px",
        flexGrow: 1,
      }}
    >
      <div
        className="timer-display"
        style={{
          padding: "40px",
          borderRadius: "8px",
          backgroundColor: "#202225",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "60%",
          maxWidth: "400px",
          minHeight: "120px",
          boxShadow: "0 2px 10px 0 rgba(0,0,0,.2)",
        }}
      >
        <span
          style={{
            fontSize: "48px",
            fontFamily: "monospace",
            color: "#fff",
            fontWeight: "600",
            letterSpacing: "2px",
          }}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
};

export default TimelapseTimer;
