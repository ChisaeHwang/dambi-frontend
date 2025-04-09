import React from "react";
import { useCalendar } from "../hooks/useCalendar";
import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import SessionsList from "./SessionsList";
import StatsView from "./StatsView";

/**
 * 메인 캘린더 컴포넌트
 */
const Calendar: React.FC = () => {
  const {
    currentMonth,
    selectedDate,
    view,
    setView,
    prevMonth,
    nextMonth,
    getSessionsForDate,
    setSelectedDate,
    selectedDateSessions,
    monthStats,
  } = useCalendar();

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-normal)] h-screen w-full flex flex-col p-3">
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md p-5 mx-auto w-[98%] max-w-[1400px] min-w-auto mb-5 h-[calc(100vh-30px)] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <CalendarHeader
            currentMonth={currentMonth}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
          />

          <div className="flex gap-2">
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 rounded text-sm ${
                view === "calendar"
                  ? "bg-[var(--primary-color)] text-white"
                  : "bg-[var(--bg-accent)] text-[var(--text-normal)]"
              }`}
            >
              캘린더 보기
            </button>
            <button
              onClick={() => setView("stats")}
              className={`px-3 py-1.5 rounded text-sm ${
                view === "stats"
                  ? "bg-[var(--primary-color)] text-white"
                  : "bg-[var(--bg-accent)] text-[var(--text-normal)]"
              }`}
            >
              통계 보기
            </button>
          </div>
        </div>

        {view === "calendar" ? (
          <>
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
          </>
        ) : (
          <StatsView currentMonth={currentMonth} monthStats={monthStats} />
        )}
      </div>
    </div>
  );
};

export default Calendar;
