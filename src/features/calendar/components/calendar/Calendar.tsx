import React from "react";
import { useCalendar } from "../../hooks/useCalendar";
import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import SessionsList from "../sessions/SessionsList";
import StatsView from "../stats/StatsView";
import WorkspaceTimelapseSection from "../timer/WorkspaceTimelapseSection";

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
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <div>
              <CalendarGrid
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                getSessionsForDate={getSessionsForDate}
                onSelectDate={setSelectedDate}
              />

              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">
                    {selectedDate.toLocaleDateString("ko-KR", {
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    작업 시간 통계
                  </h3>
                  <div className="text-sm text-[var(--text-muted)]">
                    작업은 워크스페이스에서 관리합니다
                  </div>
                </div>
                <SessionsList
                  selectedDate={selectedDate}
                  sessions={selectedDateSessions}
                />
              </div>
            </div>

            {/* 작업 상태 및 워크스페이스 링크 섹션 */}
            <div>
              <WorkspaceTimelapseSection />
            </div>
          </div>
        ) : (
          <StatsView currentMonth={currentMonth} monthStats={monthStats} />
        )}
      </div>
    </div>
  );
};

export default Calendar;
