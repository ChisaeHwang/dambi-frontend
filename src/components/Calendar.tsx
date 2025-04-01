import React, { useState } from "react";
import CalendarHeader from "./calendar/CalendarHeader";
import CalendarGrid from "./calendar/CalendarGrid";
import SessionsList from "./calendar/SessionsList";
import { WorkSession } from "../types/calendar";

// 샘플 데이터
const sampleWorkSessions: WorkSession[] = [
  {
    id: "1",
    date: new Date(2023, 3, 10, 14, 0),
    duration: 120,
    title: "웹 디자인 작업",
    category: "디자인",
  },
  {
    id: "2",
    date: new Date(2023, 3, 11, 10, 0),
    duration: 180,
    title: "프론트엔드 개발",
    category: "개발",
  },
  {
    id: "3",
    date: new Date(2023, 3, 12, 9, 0),
    duration: 240,
    title: "클라이언트 미팅",
    category: "미팅",
  },
  {
    id: "4",
    date: new Date(),
    duration: 90,
    title: "버그 수정",
    category: "개발",
  },
];

const Calendar: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions] = useState<WorkSession[]>(sampleWorkSessions);

  // 월 이동 함수
  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  // 날짜에 해당하는 세션 찾기
  const getSessionsForDate = (date: Date): WorkSession[] => {
    return sessions.filter(
      (session) =>
        session.date.getDate() === date.getDate() &&
        session.date.getMonth() === date.getMonth() &&
        session.date.getFullYear() === date.getFullYear()
    );
  };

  // 선택된 날짜의 세션 목록
  const selectedDateSessions = getSessionsForDate(selectedDate);

  return (
    <div
      className="calendar-container"
      style={{
        backgroundColor: "#36393f",
        color: "#dcddde",
        minHeight: "100vh",
        width: "100%", // 가로 스크롤 방지
        display: "flex",
        flexDirection: "column",
        padding: "12px",
        overflowX: "hidden", // 가로 스크롤 방지
      }}
    >
      <div
        className="calendar-card"
        style={{
          backgroundColor: "#2f3136",
          borderRadius: "8px",
          boxShadow: "0 2px 10px 0 rgba(0,0,0,.2)",
          padding: "20px",
          margin: "0 auto",
          width: "98%", // 여백 줄임
          maxWidth: "1400px", // 최대 너비 증가
          minWidth: "auto", // 최소 너비 제거하여 가로 스크롤 방지
        }}
      >
        <CalendarHeader
          currentMonth={currentMonth}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
        />

        <CalendarGrid
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          getSessionsForDate={getSessionsForDate}
          onSelectDate={setSelectedDate}
        />

        <SessionsList
          selectedDate={selectedDate}
          sessions={selectedDateSessions}
        />
      </div>
    </div>
  );
};

export default Calendar;
