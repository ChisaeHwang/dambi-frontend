import React from "react";
import { WorkSession } from "../../types/calendar";
import CalendarDayCard from "./CalendarDayCard";

interface CalendarGridProps {
  currentMonth: Date;
  selectedDate: Date;
  getSessionsForDate: (date: Date) => WorkSession[];
  onSelectDate: (date: Date) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentMonth,
  selectedDate,
  getSessionsForDate,
  onSelectDate,
}) => {
  // 요일 헤더
  const weekDays = ["월", "화", "수", "목", "금", "토", "일"];

  // 캘린더 그리드 생성 함수
  const renderCalendarDays = () => {
    const monthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const monthEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );
    const startDate = new Date(monthStart);
    const days = [];

    // 첫 주의 시작 요일 맞추기
    startDate.setDate(
      startDate.getDate() -
        (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1)
    );

    // 주 단위로 캘린더 생성
    while (startDate <= monthEnd) {
      const week = [];

      // 7일 루프
      for (let i = 0; i < 7; i++) {
        const cloneDate = new Date(startDate);
        const dateSessionsCount = getSessionsForDate(cloneDate).length;

        const isCurrentMonth = cloneDate.getMonth() === currentMonth.getMonth();
        const isToday =
          cloneDate.getDate() === new Date().getDate() &&
          cloneDate.getMonth() === new Date().getMonth() &&
          cloneDate.getFullYear() === new Date().getFullYear();
        const isSelected =
          cloneDate.getDate() === selectedDate.getDate() &&
          cloneDate.getMonth() === selectedDate.getMonth() &&
          cloneDate.getFullYear() === selectedDate.getFullYear();

        week.push(
          <CalendarDayCard
            key={cloneDate.toString()}
            date={cloneDate}
            isCurrentMonth={isCurrentMonth}
            isToday={isToday}
            isSelected={isSelected}
            sessionsCount={dateSessionsCount}
            onSelectDate={onSelectDate}
          />
        );

        // 다음 날로 이동
        startDate.setDate(startDate.getDate() + 1);
      }

      days.push(
        <div
          key={startDate.toString()}
          className="calendar-week"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "4px",
            marginBottom: "4px",
          }}
        >
          {week}
        </div>
      );
    }

    return days;
  };

  return (
    <>
      {/* 요일 표시 */}
      <div
        className="day-headers"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
          marginBottom: "8px",
          textAlign: "center",
        }}
      >
        {weekDays.map((day) => (
          <div
            key={day}
            style={{
              padding: "8px",
              fontWeight: "bold",
              color: "#fff",
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 캘린더 날짜 그리드 */}
      <div className="calendar-grid">{renderCalendarDays()}</div>
    </>
  );
};

export default CalendarGrid;
