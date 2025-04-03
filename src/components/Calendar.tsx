import React, { useState, useEffect } from "react";
import CalendarHeader from "./calendar/CalendarHeader";
import CalendarGrid from "./calendar/CalendarGrid";
import SessionsList from "./calendar/SessionsList";
import { WorkSession } from "../types/calendar";

// 샘플 데이터 (최근 한 달 동안의 작업 데이터로 확장)
const generateSampleWorkSessions = (): WorkSession[] => {
  const sessions: WorkSession[] = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(1); // 현재 달의 1일부터

  // 카테고리 목록
  const categories = ["디자인", "개발", "미팅", "문서", "학습"];

  // 최근 한 달 동안의 작업 세션 생성
  let id = 1;
  while (startDate <= today) {
    // 각 날짜별로 0-3개의 세션 생성
    const sessionsCount = Math.floor(Math.random() * 4);

    for (let i = 0; i < sessionsCount; i++) {
      const hours = 9 + Math.floor(Math.random() * 8); // 9시-17시 사이
      const minutes = Math.floor(Math.random() * 6) * 10; // 0, 10, 20, 30, 40, 50분
      const duration = 30 + Math.floor(Math.random() * 12) * 15; // 30분-3시간
      const category =
        categories[Math.floor(Math.random() * categories.length)];

      const sessionDate = new Date(startDate);
      sessionDate.setHours(hours, minutes);

      sessions.push({
        id: id.toString(),
        date: sessionDate,
        duration,
        title: `${category} 작업 ${i + 1}`,
        category,
      });

      id++;
    }

    // 다음 날짜로 이동
    startDate.setDate(startDate.getDate() + 1);
  }

  return sessions;
};

const Calendar: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [view, setView] = useState<"calendar" | "stats">("calendar");

  // 컴포넌트 마운트 시 샘플 데이터 생성
  useEffect(() => {
    setSessions(generateSampleWorkSessions());
  }, []);

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

  // 월 통계 계산
  const calculateMonthStats = () => {
    // 현재 월에 해당하는 세션만 필터링
    const monthSessions = sessions.filter(
      (session) =>
        session.date.getMonth() === currentMonth.getMonth() &&
        session.date.getFullYear() === currentMonth.getFullYear()
    );

    // 카테고리별 작업 시간 집계
    const categoryStats: Record<string, number> = {};
    let totalMonthTime = 0;

    monthSessions.forEach((session) => {
      if (!categoryStats[session.category]) {
        categoryStats[session.category] = 0;
      }
      categoryStats[session.category] += session.duration;
      totalMonthTime += session.duration;
    });

    // 요일별 작업 시간 집계
    const weekdayStats: number[] = [0, 0, 0, 0, 0, 0, 0]; // 월-일
    monthSessions.forEach((session) => {
      const dayOfWeek = session.date.getDay(); // 0=일, 1=월, ..., 6=토
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=월, ..., 6=일
      weekdayStats[adjustedDay] += session.duration;
    });

    return {
      categoryStats,
      weekdayStats,
      totalMonthTime,
    };
  };

  const monthStats = calculateMonthStats();

  // 요일 이름
  const weekdayNames = ["월", "화", "수", "목", "금", "토", "일"];

  // 작업 시간 포맷 함수
  const formatTotalTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분`;
  };

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-normal)] h-screen w-full flex flex-col p-3 overflow-x-hidden overflow-y-auto">
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md p-5 mx-auto w-[98%] max-w-[1400px] min-w-auto mb-5">
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
          <div className="stats-view">
            <div className="mb-6">
              <h3 className="text-white text-lg mb-4 font-medium">
                {`${currentMonth.getFullYear()}년 ${
                  currentMonth.getMonth() + 1
                }월 작업 통계`}
              </h3>

              <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg mb-4">
                <div className="text-center mb-2 text-[var(--text-positive)] text-lg font-semibold">
                  총 작업 시간: {formatTotalTime(monthStats.totalMonthTime)}
                </div>
              </div>
            </div>

            {/* 카테고리별 작업 시간 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg">
                <h4 className="text-white text-base mb-4">
                  카테고리별 작업 시간
                </h4>

                {Object.keys(monthStats.categoryStats).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(monthStats.categoryStats).map(
                      ([category, duration]) => {
                        const percentage = Math.round(
                          (duration / monthStats.totalMonthTime) * 100
                        );
                        const barColor =
                          category === "개발"
                            ? "bg-[var(--primary-color)]"
                            : category === "디자인"
                            ? "bg-[var(--status-green)]"
                            : category === "미팅"
                            ? "bg-[var(--status-yellow)]"
                            : category === "문서"
                            ? "bg-[var(--text-link)]"
                            : "bg-[var(--bg-accent)]";

                        return (
                          <div key={category} className="w-full">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm">{category}</span>
                              <span className="text-sm text-[var(--text-muted)]">
                                {formatTotalTime(duration)} ({percentage}%)
                              </span>
                            </div>
                            <div className="h-2.5 w-full bg-[var(--bg-secondary)] rounded-full">
                              <div
                                className={`h-full rounded-full ${barColor}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-[var(--text-muted)]">
                    작업 데이터가 없습니다.
                  </div>
                )}
              </div>

              {/* 요일별 작업 시간 */}
              <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg">
                <h4 className="text-white text-base mb-4">요일별 작업 시간</h4>

                {monthStats.weekdayStats.some((time) => time > 0) ? (
                  <div className="flex items-end h-48 space-x-1">
                    {monthStats.weekdayStats.map((duration, index) => {
                      const maxValue = Math.max(...monthStats.weekdayStats);
                      const heightPercentage =
                        maxValue > 0
                          ? Math.max(5, Math.round((duration / maxValue) * 100))
                          : 0;

                      return (
                        <div
                          key={index}
                          className="flex flex-col items-center flex-1"
                        >
                          <div
                            className={`w-full ${
                              index < 5
                                ? "bg-[var(--primary-color)]"
                                : "bg-[var(--status-yellow)]"
                            } rounded-t`}
                            style={{ height: `${heightPercentage}%` }}
                          ></div>
                          <div className="text-xs text-[var(--text-muted)] mt-2">
                            {weekdayNames[index]}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {Math.floor(duration / 60)}시간
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-[var(--text-muted)]">
                    작업 데이터가 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;
