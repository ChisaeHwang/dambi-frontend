import React, { useState } from "react";
import { useCalendar } from "../hooks/useCalendar";
import CalendarHeader from "./CalendarHeader";
import CalendarGrid from "./CalendarGrid";
import SessionsList from "./SessionsList";
import StatsView from "./StatsView";
import TimerPanel from "./TimerPanel";
import SessionForm from "./SessionForm";
import { WorkSession } from "../types";

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
    addSession,
    updateSession,
    deleteSession,
  } = useCalendar();

  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingSession, setEditingSession] = useState<WorkSession | null>(
    null
  );

  // 세션 추가 폼 표시
  const handleShowAddForm = () => {
    setEditingSession(null);
    setShowAddForm(true);
  };

  // 세션 편집 폼 표시
  const handleEditSession = (session: WorkSession) => {
    setEditingSession(session);
    setShowAddForm(true);
  };

  // 세션 저장 처리
  const handleSaveSession = (session: WorkSession) => {
    if (editingSession) {
      updateSession(session);
    } else {
      addSession(session);
    }
    setShowAddForm(false);
  };

  // 세션 폼 취소
  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingSession(null);
  };

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

              {showAddForm ? (
                <div className="mt-6">
                  <SessionForm
                    session={editingSession || undefined}
                    onSave={handleSaveSession}
                    onCancel={handleCancelForm}
                  />
                </div>
              ) : (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">
                      {selectedDate.toLocaleDateString("ko-KR", {
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      작업 목록
                    </h3>
                    <button
                      onClick={handleShowAddForm}
                      className="px-3 py-1.5 rounded text-sm bg-[var(--primary-color)] text-white"
                    >
                      작업 추가
                    </button>
                  </div>
                  <SessionsList
                    selectedDate={selectedDate}
                    sessions={selectedDateSessions}
                    onEditSession={handleEditSession}
                    onDeleteSession={deleteSession}
                  />
                </div>
              )}
            </div>

            {/* 타이머 패널 */}
            <div>
              <TimerPanel />
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
