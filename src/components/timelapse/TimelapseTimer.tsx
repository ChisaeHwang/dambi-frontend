import React from "react";

interface TimelapseTimerProps {
  formattedTime: string;
}

const TimelapseTimer: React.FC<TimelapseTimerProps> = ({ formattedTime }) => (
  <div
    className="timer-display"
    style={{
      textAlign: "center",
      margin: "20px 0",
      border: "1px solid #40444b",
      borderRadius: "8px",
      padding: "20px",
    }}
  >
    <div
      className="time-counter"
      style={{
        fontSize: "48px",
        fontWeight: "700",
        color: "#fff",
        fontFamily: "monospace",
      }}
    >
      {formattedTime}
    </div>
  </div>
);

export default TimelapseTimer;
