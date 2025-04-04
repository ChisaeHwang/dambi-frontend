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

        // 세션에서 총 작업 시간 계산
        const totalWorkTime = getSessionsForDate(cloneDate).reduce(
          (total, session) => total + session.duration,
          0
        );

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
            totalWorkTime={totalWorkTime}
            onSelectDate={onSelectDate}
          />
        );

        // 다음 날로 이동
        startDate.setDate(startDate.getDate() + 1);
      }

      days.push(
        <div key={startDate.toString()} className="grid grid-cols-7 gap-1 mb-1">
          {week}
        </div>
      );
    }

    return days;
  };

  return (
    <>
      {/* 요일 표시 */}
      <div className="grid grid-cols-7 gap-1 mb-2 text-center">
        {weekDays.map((day) => (
          <div key={day} className="py-2 font-bold text-white">
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
