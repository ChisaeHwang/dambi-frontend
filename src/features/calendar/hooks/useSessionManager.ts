import { useState, useEffect, useCallback } from "react";
import { WorkSession } from "../types";
import {
  sessionManager,
  SessionQueryResult,
} from "../services/session/SessionManager";
import { SessionState } from "../services/timer/TimerService";
import { DateService } from "../services/timer/DateService";
import { useErrorContext } from "../../../context/ErrorContext";

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

  // ErrorContext 사용
  const { addError } = useErrorContext();

  // 세션 목록 로드
  const loadSessions = useCallback(() => {
    try {
      setIsLoading(true);
      const allSessions = sessionManager.getAllSessions();
      setSessions(allSessions);
    } catch (err) {
      console.error("세션 로드 오류:", err);
      addError(err instanceof Error ? err : String(err), {
        source: "세션 관리",
        code: "SESSION_LOAD_ERROR",
      });
    } finally {
      setIsLoading(false);
    }
  }, [addError]);

  // 세션 상태 업데이트
  const updateSessionState = useCallback(() => {
    try {
      const state = sessionManager.getSessionState();
      setSessionState(state);
    } catch (err) {
      console.error("세션 상태 업데이트 오류:", err);
      addError(err instanceof Error ? err : String(err), {
        source: "세션 관리",
        code: "SESSION_STATE_UPDATE_ERROR",
      });
    }
  }, [addError]);

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
      try {
        const today = DateService.today();
        return sessionManager.getSessionsByDate(today, excludeRecordings);
      } catch (err) {
        console.error("오늘의 세션 로드 오류:", err);
        addError(err instanceof Error ? err : String(err), {
          source: "세션 관리",
          code: "TODAY_SESSIONS_ERROR",
        });
        return { sessions: [], totalDuration: 0, count: 0 };
      }
    },
    [addError]
  );

  // 날짜별 세션 가져오기
  const getSessionsByDate = useCallback(
    (date: Date, excludeRecordings: boolean = false): SessionQueryResult => {
      try {
        return sessionManager.getSessionsByDate(date, excludeRecordings);
      } catch (err) {
        console.error("날짜별 세션 로드 오류:", err);
        addError(err instanceof Error ? err : String(err), {
          source: "세션 관리",
          code: "DATE_SESSIONS_ERROR",
          context: { date: date.toISOString() },
        });
        return { sessions: [], totalDuration: 0, count: 0 };
      }
    },
    [addError]
  );

  // 세션 시작
  const startSession = useCallback(
    (
      title: string,
      taskType: string,
      isRecording: boolean = false
    ): WorkSession | null => {
      try {
        return sessionManager.startSession(
          title,
          taskType,
          "manual",
          isRecording
        );
      } catch (err) {
        console.error("세션 시작 오류:", err);
        addError(err instanceof Error ? err : String(err), {
          source: "세션 관리",
          code: "SESSION_START_ERROR",
          context: { title, taskType, isRecording },
        });
        return null;
      }
    },
    [addError]
  );

  // 세션 중지
  const stopSession = useCallback((): WorkSession | null => {
    try {
      return sessionManager.stopSession();
    } catch (err) {
      console.error("세션 종료 오류:", err);
      addError(err instanceof Error ? err : String(err), {
        source: "세션 관리",
        code: "SESSION_STOP_ERROR",
      });
      return null;
    }
  }, [addError]);

  // 세션 일시 정지
  const pauseSession = useCallback((): void => {
    try {
      sessionManager.pauseSession();
    } catch (err) {
      console.error("세션 일시 정지 오류:", err);
      addError(err instanceof Error ? err : String(err), {
        source: "세션 관리",
        code: "SESSION_PAUSE_ERROR",
      });
    }
  }, [addError]);

  // 세션 재개
  const resumeSession = useCallback((): void => {
    try {
      sessionManager.resumeSession();
    } catch (err) {
      console.error("세션 재개 오류:", err);
      addError(err instanceof Error ? err : String(err), {
        source: "세션 관리",
        code: "SESSION_RESUME_ERROR",
      });
    }
  }, [addError]);

  // 세션 업데이트
  const updateSession = useCallback(
    (session: WorkSession): boolean => {
      try {
        return sessionManager.updateSession(session);
      } catch (err) {
        console.error("세션 업데이트 오류:", err);
        addError(err instanceof Error ? err : String(err), {
          source: "세션 관리",
          code: "SESSION_UPDATE_ERROR",
          context: { sessionId: session.id },
        });
        return false;
      }
    },
    [addError]
  );

  // 세션 삭제
  const deleteSession = useCallback(
    (sessionId: string): void => {
      try {
        sessionManager.deleteSession(sessionId);
      } catch (err) {
        console.error("세션 삭제 오류:", err);
        addError(err instanceof Error ? err : String(err), {
          source: "세션 관리",
          code: "SESSION_DELETE_ERROR",
          context: { sessionId },
        });
      }
    },
    [addError]
  );

  // 새 세션 생성
  const createSession = useCallback(
    (sessionData: Partial<WorkSession>): WorkSession | null => {
      try {
        return sessionManager.createSession(sessionData);
      } catch (err) {
        console.error("세션 생성 오류:", err);
        addError(err instanceof Error ? err : String(err), {
          source: "세션 관리",
          code: "SESSION_CREATE_ERROR",
        });
        return null;
      }
    },
    [addError]
  );

  // 활성 세션 가져오기
  const getActiveSession = useCallback((): WorkSession | null => {
    try {
      return sessionManager.getActiveSession();
    } catch (err) {
      console.error("활성 세션 조회 오류:", err);
      addError(err instanceof Error ? err : String(err), {
        source: "세션 관리",
        code: "ACTIVE_SESSION_ERROR",
      });
      return null;
    }
  }, [addError]);

  // 세션 데이터 내보내기
  const exportSessions = useCallback((): string => {
    try {
      return sessionManager.exportSessions();
    } catch (err) {
      console.error("세션 내보내기 오류:", err);
      addError(err instanceof Error ? err : String(err), {
        source: "세션 관리",
        code: "SESSION_EXPORT_ERROR",
      });
      return "";
    }
  }, [addError]);

  // 세션 데이터 가져오기
  const importSessions = useCallback(
    (jsonData: string, replaceExisting: boolean = false): boolean => {
      try {
        return sessionManager.importSessions(jsonData, replaceExisting);
      } catch (err) {
        console.error("세션 가져오기 오류:", err);
        addError(err instanceof Error ? err : String(err), {
          source: "세션 관리",
          code: "SESSION_IMPORT_ERROR",
        });
        return false;
      }
    },
    [addError]
  );

  // 미완료 세션 정리
  const cleanupIncompleteSessions = useCallback((): void => {
    try {
      sessionManager.cleanupIncompleteSessions();
    } catch (err) {
      console.error("미완료 세션 정리 오류:", err);
      addError(err instanceof Error ? err : String(err), {
        source: "세션 관리",
        code: "SESSION_CLEANUP_ERROR",
      });
    }
  }, [addError]);

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
