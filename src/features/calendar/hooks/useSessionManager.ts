import { useState, useEffect, useCallback } from "react";
import { WorkSession } from "../types";
import { sessionManager, SessionQueryResult } from "../services/SessionManager";
import { SessionState } from "../services/TimerService";
import { DateService } from "../services/DateService";

/**
 * 세션 관리 훅
 *
 * 단일 책임: UI 컴포넌트와 SessionManager 간의 상호작용 담당
 * 의존성 순환 문제 해결을 위한 중간 계층 역할
 */
export function useSessionManager() {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 세션 목록 로드
  const loadSessions = useCallback(() => {
    setIsLoading(true);
    const allSessions = sessionManager.getAllSessions();
    setSessions(allSessions);
    setIsLoading(false);
  }, []);

  // 세션 상태 업데이트
  const updateSessionState = useCallback(() => {
    const state = sessionManager.getSessionState();
    setSessionState(state);
  }, []);

  // 초기화 및 변경 구독
  useEffect(() => {
    // 초기 데이터 로드
    loadSessions();
    updateSessionState();

    // 세션 변경 리스너 등록
    const unsubscribe = sessionManager.addChangeListener((updatedSessions) => {
      setSessions(updatedSessions);
      updateSessionState();
    });

    // 컴포넌트 언마운트 시 리스너 정리
    return () => {
      unsubscribe();
    };
  }, [loadSessions, updateSessionState]);

  // 오늘 세션 가져오기
  const getTodaySessions = useCallback(
    (excludeRecordings: boolean = false): SessionQueryResult => {
      const today = DateService.today();
      return sessionManager.getSessionsByDate(today, excludeRecordings);
    },
    []
  );

  // 날짜별 세션 가져오기
  const getSessionsByDate = useCallback(
    (date: Date, excludeRecordings: boolean = false): SessionQueryResult => {
      return sessionManager.getSessionsByDate(date, excludeRecordings);
    },
    []
  );

  // 세션 시작
  const startSession = useCallback(
    (
      title: string,
      taskType: string,
      isRecording: boolean = false
    ): WorkSession => {
      return sessionManager.startSession(
        title,
        taskType,
        "manual",
        isRecording
      );
    },
    []
  );

  // 세션 중지
  const stopSession = useCallback((): WorkSession | null => {
    return sessionManager.stopSession();
  }, []);

  // 세션 일시 정지
  const pauseSession = useCallback((): void => {
    sessionManager.pauseSession();
  }, []);

  // 세션 재개
  const resumeSession = useCallback((): void => {
    sessionManager.resumeSession();
  }, []);

  // 세션 업데이트
  const updateSession = useCallback((session: WorkSession): boolean => {
    return sessionManager.updateSession(session);
  }, []);

  // 세션 삭제
  const deleteSession = useCallback((sessionId: string): void => {
    sessionManager.deleteSession(sessionId);
  }, []);

  // 새 세션 생성
  const createSession = useCallback(
    (sessionData: Partial<WorkSession>): WorkSession => {
      return sessionManager.createSession(sessionData);
    },
    []
  );

  // 활성 세션 가져오기
  const getActiveSession = useCallback((): WorkSession | null => {
    return sessionManager.getActiveSession();
  }, []);

  // 세션 데이터 내보내기
  const exportSessions = useCallback((): string => {
    return sessionManager.exportSessions();
  }, []);

  // 세션 데이터 가져오기
  const importSessions = useCallback(
    (jsonData: string, replaceExisting: boolean = false): boolean => {
      return sessionManager.importSessions(jsonData, replaceExisting);
    },
    []
  );

  // 미완료 세션 정리
  const cleanupIncompleteSessions = useCallback((): void => {
    sessionManager.cleanupIncompleteSessions();
  }, []);

  return {
    // 상태
    sessions,
    sessionState,
    isLoading,
    activeSession: sessionState?.session,

    // 쿼리 메서드
    getTodaySessions,
    getSessionsByDate,
    getActiveSession,

    // 액션 메서드
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    updateSession,
    deleteSession,
    createSession,
    exportSessions,
    importSessions,
    cleanupIncompleteSessions,

    // 데이터 관리
    loadSessions,
  };
}
