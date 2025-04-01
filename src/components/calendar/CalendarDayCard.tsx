import React from "react";

interface CalendarDayCardProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  sessionsCount: number;
  onSelectDate: (date: Date) => void;
}

const CalendarDayCard: React.FC<CalendarDayCardProps> = ({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  sessionsCount,
  onSelectDate,
}) => (
  <div
    className={`calendar-day ${
      isCurrentMonth ? "current-month" : "other-month"
    } ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
    onClick={() => onSelectDate(date)}
    style={{
      padding: "8px",
      border: "1px solid var(--border-color)",
      backgroundColor: isSelected
        ? "var(--bg-modifier-selected)"
        : isToday
        ? "var(--bg-modifier-active)"
        : "var(--bg-primary)",
      color: isCurrentMonth ? "var(--text-normal)" : "var(--text-muted)",
      cursor: "pointer",
      borderRadius: "4px",
      position: "relative",
      minHeight: "90px",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        marginBottom: "4px",
        fontWeight: isToday ? "bold" : "normal",
        backgroundColor: isToday ? "var(--brand-experiment)" : "transparent",
        color: isToday ? "white" : "inherit",
      }}
    >
      {date.getDate()}
    </div>

    {isCurrentMonth && sessionsCount > 0 && (
      <div
        style={{
          fontSize: "0.8rem",
          color: "var(--brand-experiment)",
          marginTop: "4px",
        }}
      >
        {sessionsCount} 작업
      </div>
    )}
  </div>
);

export default CalendarDayCard;
