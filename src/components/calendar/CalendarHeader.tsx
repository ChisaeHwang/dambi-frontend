import React from "react";

interface CalendarHeaderProps {
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentMonth,
  onPrevMonth,
  onNextMonth,
}) => (
  <div
    className="calendar-header"
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px",
    }}
  >
    <h2
      style={{
        color: "#fff",
        fontSize: "20px",
        margin: 0,
        fontWeight: "600",
      }}
    >
      작업 캘린더
    </h2>
    <div className="month-navigation" style={{ display: "flex", gap: "8px" }}>
      <div
        style={{
          color: "#fff",
          fontSize: "16px",
          fontWeight: "500",
        }}
      >
        {`${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월`}
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        <button
          onClick={onPrevMonth}
          style={{
            backgroundColor: "#4f545c",
            border: "none",
            borderRadius: "4px",
            color: "white",
            padding: "4px 8px",
            cursor: "pointer",
          }}
        >
          이전
        </button>
        <button
          onClick={onNextMonth}
          style={{
            backgroundColor: "#4f545c",
            border: "none",
            borderRadius: "4px",
            color: "white",
            padding: "4px 8px",
            cursor: "pointer",
          }}
        >
          다음
        </button>
      </div>
    </div>
  </div>
);

export default CalendarHeader;
