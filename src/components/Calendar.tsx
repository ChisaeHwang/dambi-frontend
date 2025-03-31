import React, { useState } from "react";

interface WorkSession {
  id: string;
  date: Date;
  duration: number; // 분 단위
  title: string;
  category: string;
}

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

  // 날짜 포맷 함수
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분`;
  };

  // 캘린더 그리드 생성
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
          <div
            key={cloneDate.toString()}
            className={`calendar-day ${
              isCurrentMonth ? "current-month" : "other-month"
            } ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
            onClick={() => setSelectedDate(cloneDate)}
            style={{
              padding: "8px",
              border: "1px solid var(--border-color)",
              backgroundColor: isSelected
                ? "var(--bg-modifier-selected)"
                : isToday
                ? "var(--bg-modifier-active)"
                : "var(--bg-primary)",
              color: isCurrentMonth
                ? "var(--text-normal)"
                : "var(--text-muted)",
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
                backgroundColor: isToday
                  ? "var(--brand-experiment)"
                  : "transparent",
                color: isToday ? "white" : "inherit",
              }}
            >
              {cloneDate.getDate()}
            </div>

            {isCurrentMonth && dateSessionsCount > 0 && (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--brand-experiment)",
                  marginTop: "4px",
                }}
              >
                {dateSessionsCount} 작업
              </div>
            )}
          </div>
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

  // 선택된 날짜의 세션 목록 표시
  const renderSelectedDateSessions = () => {
    const dateSessions = getSessionsForDate(selectedDate);

    if (dateSessions.length === 0) {
      return (
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          이 날짜에 기록된 작업이 없습니다.
        </div>
      );
    }

    return (
      <div>
        {dateSessions.map((session) => (
          <div
            key={session.id}
            style={{
              padding: "12px",
              marginBottom: "8px",
              backgroundColor: "var(--bg-secondary)",
              borderRadius: "8px",
              borderLeft: "4px solid var(--brand-experiment)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontWeight: "bold" }}>{session.title}</span>
              <span
                style={{
                  fontSize: "0.8rem",
                  backgroundColor: "var(--bg-modifier-accent)",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  color: "var(--text-muted)",
                }}
              >
                {session.category}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.9rem",
                color: "var(--text-muted)",
              }}
            >
              <span>
                {session.date.getHours().toString().padStart(2, "0")}:
                {session.date.getMinutes().toString().padStart(2, "0")}
              </span>
              <span>{formatTime(session.duration)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 요일 헤더
  const weekDays = ["월", "화", "수", "목", "금", "토", "일"];

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
          <div
            className="month-navigation"
            style={{ display: "flex", gap: "8px" }}
          >
            <div
              style={{
                color: "#fff",
                fontSize: "16px",
                fontWeight: "500",
              }}
            >
              {`${currentMonth.getFullYear()}년 ${
                currentMonth.getMonth() + 1
              }월`}
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={prevMonth}
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
                onClick={nextMonth}
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
          {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
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

        {/* 선택된 날짜의 세션 */}
        <div
          className="selected-date-info"
          style={{
            marginTop: "20px",
            borderTop: "1px solid #40444b",
            paddingTop: "16px",
          }}
        >
          <h3
            style={{
              color: "#fff",
              fontSize: "16px",
              marginBottom: "12px",
            }}
          >
            {`${selectedDate.getFullYear()}년 ${
              selectedDate.getMonth() + 1
            }월 ${selectedDate.getDate()}일 작업`}
          </h3>
          {renderSelectedDateSessions()}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
