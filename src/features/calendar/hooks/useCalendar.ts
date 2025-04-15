import { useState, useEffect, useCallback } from "react";
import {
  WorkSession,
  MonthStats,
  CalendarViewType,
  AppSettings,
} from "../types";
import { sessionStorageService } from "../utils";
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
    if (loadedSessions.length > 0) {
      setSessions(loadedSessions);
    } else {
      // 세션 데이터가 없으면 샘플 데이터 생성 (개발용)
      const sampleSessions = generateSampleWorkSessions();
      setSessions(sampleSessions);
      sessionStorageService.saveSessions(sampleSessions);
    }

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
      // "녹화" 카테고리는 건너뛰기
      if (session.taskType && session.taskType.toLowerCase() === "녹화") {
        return;
      }

      if (!categoryStats[session.taskType]) {
        categoryStats[session.taskType] = 0;
      }
      categoryStats[session.taskType] += session.duration;
      totalMonthTime += session.duration;
    });

    // 요일별 작업 시간 집계
    const weekdayStats: number[] = [0, 0, 0, 0, 0, 0, 0]; // 월-일
    monthSessions.forEach((session) => {
      // "녹화" 카테고리는 건너뛰기
      if (session.taskType && session.taskType.toLowerCase() === "녹화") {
        return;
      }

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
      const taskType =
        categories[Math.floor(Math.random() * categories.length)];

      const sessionDate = new Date(startDate);
      sessionDate.setHours(hours, minutes);

      const startTime = new Date(sessionDate);
      const endTime = new Date(sessionDate);
      endTime.setMinutes(endTime.getMinutes() + duration);

      sessions.push({
        id: id.toString(),
        date: sessionDate,
        startTime: startTime,
        endTime: endTime,
        duration,
        title: `${taskType} 작업 ${i + 1}`,
        taskType,
        isRecording: false,
        source: "manual",
        isActive: false,
      });

      id++;
    }

    // 다음 날짜로 이동
    startDate.setDate(startDate.getDate() + 1);
  }

  return sessions;
};
