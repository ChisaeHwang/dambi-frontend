import { useState, useEffect, useCallback } from "react";
import {
  WorkSession,
  MonthStats,
  CalendarViewType,
  AppSettings,
} from "../types";
import { sessionStorageService, filterOutRecordingSessions } from "../utils";
import { timerService } from "../services/TimerService";

/**
 * 캘린더 기능을 관리하는 훅
 */
export const useCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [view, setView] = useState<CalendarViewType>("calendar");
  const [settings, setSettings] = useState<AppSettings>(
    sessionStorageService.getSettings()
  );

  // 세션 데이터 로드
  useEffect(() => {
    // 로컬 스토리지에서 세션 데이터 로드
    const loadedSessions = sessionStorageService.getSessions();
    setSessions(loadedSessions);

    // 오전 9시 리셋 확인
    timerService.checkDailyReset();

    // 타이머 이벤트 리스너 등록
    const removeListener = timerService.addEventListener(
      (event, session, duration) => {
        if (event === "start" || event === "stop" || event === "reset") {
          // 세션 변경 시 세션 목록 갱신
          setSessions(sessionStorageService.getSessions());
        }
      }
    );

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      removeListener();
    };
  }, []);

  // 설정 변경 감지 및 적용
  useEffect(() => {
    // 설정 변경 시 저장
    sessionStorageService.saveSettings(settings);
  }, [settings]);

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
      // sessions이 배열이 아닌 경우 빈 배열 반환
      if (!Array.isArray(sessions)) {
        console.error("sessions is not an array:", sessions);
        return [];
      }

      return sessions.filter((session) => {
        // session이 유효한지 확인
        if (!session || typeof session !== "object") {
          return false;
        }

        // session.date가 유효한지 확인하고 Date 객체로 변환
        let sessionDate: Date;
        try {
          sessionDate = new Date(session.date);

          // 유효한 날짜인지 확인
          if (isNaN(sessionDate.getTime())) {
            console.warn("Invalid session date:", session.date);
            return false;
          }

          return (
            sessionDate.getDate() === date.getDate() &&
            sessionDate.getMonth() === date.getMonth() &&
            sessionDate.getFullYear() === date.getFullYear()
          );
        } catch (error) {
          console.error("Error comparing dates:", error, session);
          return false;
        }
      });
    },
    [sessions]
  );

  // 선택된 날짜의 세션 목록
  const selectedDateSessions = getSessionsForDate(selectedDate);

  // 세션 추가 함수
  const addSession = useCallback((session: WorkSession) => {
    setSessions((prev) => {
      const newSessions = [...prev, session];
      sessionStorageService.saveSessions(newSessions);
      return newSessions;
    });
  }, []);

  // 세션 업데이트 함수
  const updateSession = useCallback((updatedSession: WorkSession) => {
    setSessions((prev) => {
      const index = prev.findIndex((s) => s.id === updatedSession.id);
      if (index !== -1) {
        const newSessions = [...prev];
        newSessions[index] = updatedSession;
        sessionStorageService.saveSessions(newSessions);
        return newSessions;
      }
      return prev;
    });
  }, []);

  // 세션 삭제 함수
  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const newSessions = prev.filter((s) => s.id !== sessionId);
      sessionStorageService.saveSessions(newSessions);
      return newSessions;
    });
  }, []);

  // 설정 업데이트 함수
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updatedSettings = { ...prev, ...newSettings };
      sessionStorageService.saveSettings(updatedSettings);
      return updatedSettings;
    });
  }, []);

  // 월 통계 계산
  const calculateMonthStats = useCallback((): MonthStats => {
    // sessions이 배열이 아닌 경우 기본 통계 반환
    if (!Array.isArray(sessions)) {
      console.error(
        "sessions is not an array in calculateMonthStats:",
        sessions
      );
      return {
        categoryStats: {},
        weekdayStats: [0, 0, 0, 0, 0, 0, 0],
        totalMonthTime: 0,
      };
    }

    // 현재 월에 해당하는 세션만 필터링
    const monthSessions = sessions.filter((session) => {
      if (!session || typeof session !== "object" || !session.date) {
        return false;
      }

      try {
        const sessionDate = new Date(session.date);
        return (
          sessionDate.getMonth() === currentMonth.getMonth() &&
          sessionDate.getFullYear() === currentMonth.getFullYear()
        );
      } catch (error) {
        console.error("Error filtering month sessions:", error);
        return false;
      }
    });

    // "녹화" 카테고리를 제외한 세션 필터링
    const filteredSessions = filterOutRecordingSessions(monthSessions);

    // 카테고리별 작업 시간 집계
    const categoryStats: Record<string, number> = {};
    let totalMonthTime = 0;

    filteredSessions.forEach((session) => {
      if (!categoryStats[session.taskType]) {
        categoryStats[session.taskType] = 0;
      }
      categoryStats[session.taskType] += session.duration;
      totalMonthTime += session.duration;
    });

    // 요일별 작업 시간 집계
    const weekdayStats: number[] = [0, 0, 0, 0, 0, 0, 0]; // 월-일
    filteredSessions.forEach((session) => {
      try {
        const sessionDate = new Date(session.date);
        const dayOfWeek = sessionDate.getDay(); // 0=일, 1=월, ..., 6=토
        const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=월, ..., 6=일
        weekdayStats[adjustedDay] += session.duration;
      } catch (error) {
        console.error("Error calculating weekday stats:", error);
      }
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
    settings,
    setView,
    prevMonth,
    nextMonth,
    getSessionsForDate,
    setSelectedDate,
    selectedDateSessions,
    monthStats: calculateMonthStats(),
    addSession,
    updateSession,
    deleteSession,
    updateSettings,
  };
};
