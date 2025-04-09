import { useState, useEffect, useCallback } from "react";
import { WorkSession, MonthStats, CalendarViewType } from "../types";

/**
 * 캘린더 기능을 관리하는 훅
 */
export const useCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [view, setView] = useState<CalendarViewType>("calendar");

  // 컴포넌트 마운트 시 샘플 데이터 생성
  useEffect(() => {
    setSessions(generateSampleWorkSessions());
  }, []);

  // 월 이동 함수
  const prevMonth = useCallback(() => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  }, [currentMonth]);

  const nextMonth = useCallback(() => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  }, [currentMonth]);

  // 날짜에 해당하는 세션 찾기
  const getSessionsForDate = useCallback(
    (date: Date): WorkSession[] => {
      return sessions.filter(
        (session) =>
          session.date.getDate() === date.getDate() &&
          session.date.getMonth() === date.getMonth() &&
          session.date.getFullYear() === date.getFullYear()
      );
    },
    [sessions]
  );

  // 선택된 날짜의 세션 목록
  const selectedDateSessions = getSessionsForDate(selectedDate);

  // 월 통계 계산
  const calculateMonthStats = useCallback((): MonthStats => {
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
  }, [currentMonth, sessions]);

  return {
    currentMonth,
    selectedDate,
    sessions,
    view,
    setView,
    prevMonth,
    nextMonth,
    getSessionsForDate,
    setSelectedDate,
    selectedDateSessions,
    monthStats: calculateMonthStats(),
  };
};

/**
 * 샘플 작업 세션 데이터 생성 함수
 */
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
