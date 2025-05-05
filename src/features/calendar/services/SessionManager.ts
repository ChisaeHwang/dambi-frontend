import { WorkSession } from "../types";
import { sessionStorageService, filterOutRecordingSessions } from "../utils";
import { timerService, SessionState } from "./TimerService";
import { v4 as uuidv4 } from "uuid";

/**
 * 세션 쿼리 결과 타입
 */
export type SessionQueryResult = {
  sessions: WorkSession[];
  totalDuration: number;
  count: number;
};

/**
 * 작업 세션 관리 서비스
 *
 * 단일 책임: 세션 데이터의 CRUD 및 쿼리 작업 담당
 * 타이머 관련 로직은 TimerService에 위임
 */
export class SessionManager {
  private sessions: WorkSession[] = [];
  private listeners: Array<(sessions: WorkSession[]) => void> = [];
  private sessionState: SessionState | null = null;

  constructor() {
    // 초기화 시 세션 데이터 로드
    this.loadSessions();

    // TimerService의 상태 변경을 구독
    timerService.setStateChangeCallback(this.handleSessionStateChange);

    // 타이머 이벤트 리스너 등록 - 세션 변경 시 데이터 다시 로드
    timerService.addEventListener((event, session, duration) => {
      if (event === "start" || event === "stop") {
        this.loadSessions();
      }
    });

    // 세션 데이터 정기 갱신 (1분마다)
    setInterval(() => {
      this.loadSessions();
    }, 60000);

    // 오전 9시 리셋 체크 - TimerService의 기능 활용
    this.setupDailyReset();
  }

  /**
   * TimerService 상태 변경 핸들러
   */
  private handleSessionStateChange = (state: SessionState): void => {
    this.sessionState = state;
    // 필요 시 추가 작업 수행
  };

  /**
   * 세션 데이터 로드
   */
  private loadSessions(): void {
    const loadedSessions = sessionStorageService.getSessions();
    this.sessions = loadedSessions;
    this.notifyListeners();
  }

  /**
   * 모든 세션 가져오기
   * @param includeRecording 녹화 세션 포함 여부
   */
  getAllSessions(includeRecording: boolean = true): WorkSession[] {
    const sessions = [...this.sessions];
    return includeRecording ? sessions : filterOutRecordingSessions(sessions);
  }

  /**
   * 특정 날짜의 세션 가져오기
   */
  getSessionsByDate(
    date: Date,
    includeRecording: boolean = true
  ): SessionQueryResult {
    const sessions = this.sessions.filter(
      (session) =>
        session.date.getDate() === date.getDate() &&
        session.date.getMonth() === date.getMonth() &&
        session.date.getFullYear() === date.getFullYear()
    );

    const filteredSessions = includeRecording
      ? sessions
      : filterOutRecordingSessions(sessions);

    return {
      sessions: filteredSessions,
      totalDuration: this.calculateTotalDuration(filteredSessions),
      count: filteredSessions.length,
    };
  }

  /**
   * 특정 기간의 세션 가져오기
   */
  getSessionsByDateRange(
    startDate: Date,
    endDate: Date,
    includeRecording: boolean = true
  ): SessionQueryResult {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const sessions = this.sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      return sessionDate >= start && sessionDate <= end;
    });

    const filteredSessions = includeRecording
      ? sessions
      : filterOutRecordingSessions(sessions);

    return {
      sessions: filteredSessions,
      totalDuration: this.calculateTotalDuration(filteredSessions),
      count: filteredSessions.length,
    };
  }

  /**
   * 특정 월의 세션 가져오기
   */
  getSessionsByMonth(
    year: number,
    month: number,
    includeRecording: boolean = true
  ): SessionQueryResult {
    const sessions = this.sessions.filter(
      (session) =>
        session.date.getMonth() === month && session.date.getFullYear() === year
    );

    const filteredSessions = includeRecording
      ? sessions
      : filterOutRecordingSessions(sessions);

    return {
      sessions: filteredSessions,
      totalDuration: this.calculateTotalDuration(filteredSessions),
      count: filteredSessions.length,
    };
  }

  /**
   * 특정 작업 유형의 세션 가져오기
   */
  getSessionsByTaskType(taskType: string): SessionQueryResult {
    const sessions = this.sessions.filter(
      (session) => session.taskType === taskType
    );

    return {
      sessions,
      totalDuration: this.calculateTotalDuration(sessions),
      count: sessions.length,
    };
  }

  /**
   * 특정 태그의 세션 가져오기
   */
  getSessionsByTag(tag: string): SessionQueryResult {
    const sessions = this.sessions.filter((session) =>
      session.tags?.includes(tag)
    );

    return {
      sessions,
      totalDuration: this.calculateTotalDuration(sessions),
      count: sessions.length,
    };
  }

  /**
   * 총 작업 시간 계산 (분 단위)
   */
  private calculateTotalDuration(sessions: WorkSession[]): number {
    return sessions.reduce((total, session) => total + session.duration, 0);
  }

  /**
   * 활성 세션 가져오기
   */
  getActiveSession(): WorkSession | null {
    return timerService.getActiveSession();
  }

  /**
   * 현재 세션 상태 가져오기
   */
  getSessionState(): SessionState | null {
    return this.sessionState || timerService.getSessionState();
  }

  /**
   * 새 세션 생성 (저장만 하고 활성화하지 않는 경우)
   */
  createSession(
    title: string,
    taskType: string,
    date: Date = new Date(),
    duration: number = 0,
    source: "electron" | "browser" | "manual" = "manual",
    tags: string[] = [],
    isRecording: boolean = false
  ): WorkSession {
    // 새 세션 생성
    const newSession: WorkSession = {
      id: uuidv4(),
      date,
      startTime: date,
      endTime: null,
      duration,
      title,
      taskType,
      isRecording,
      source,
      isActive: false, // 기본적으로 비활성 상태로 생성
      tags,
    };

    // 로컬 캐시에 추가
    this.sessions.push(newSession);

    // 스토리지에 저장
    sessionStorageService.addSession(newSession);

    // 리스너 알림
    this.notifyListeners();

    return newSession;
  }

  /**
   * 작업 세션 시작 - TimerService에 위임
   */
  startSession(
    title: string,
    taskType: string,
    source: "electron" | "browser" | "manual" = "manual",
    isRecording: boolean = false
  ): WorkSession {
    return timerService.startSession(title, taskType, source, isRecording);
  }

  /**
   * 작업 세션 중지 - TimerService에 위임
   */
  stopSession(): WorkSession | null {
    const completedSession = timerService.stopSession();

    if (completedSession) {
      // 세션 목록 갱신
      this.loadSessions();
    }

    return completedSession;
  }

  /**
   * 작업 세션 일시 정지 - TimerService에 위임
   */
  pauseSession(): void {
    timerService.pauseSession();
  }

  /**
   * 작업 세션 재개 - TimerService에 위임
   */
  resumeSession(): void {
    timerService.resumeSession();
  }

  /**
   * 세션 업데이트
   */
  updateSession(updatedSession: WorkSession): void {
    // 활성 세션인 경우 TimerService에도 알림
    if (updatedSession.isActive) {
      timerService.updateActiveSession(updatedSession);
    }

    // 스토리지에 저장
    sessionStorageService.updateSession(updatedSession);

    // 로컬 캐시 업데이트
    const index = this.sessions.findIndex((s) => s.id === updatedSession.id);
    if (index !== -1) {
      this.sessions[index] = updatedSession;
      this.notifyListeners();
    } else {
      // 세션이 없으면 추가
      this.sessions.push(updatedSession);
      this.notifyListeners();
    }
  }

  /**
   * 세션 삭제
   */
  deleteSession(sessionId: string): void {
    // 활성 세션인지 확인
    const activeSession = timerService.getActiveSession();
    if (activeSession && activeSession.id === sessionId) {
      timerService.stopSession();
    }

    // 스토리지에서 삭제
    sessionStorageService.deleteSession(sessionId);

    // 로컬 캐시 업데이트
    this.sessions = this.sessions.filter((s) => s.id !== sessionId);

    // 리스너 알림
    this.notifyListeners();
  }

  /**
   * 여러 세션 일괄 삭제
   */
  deleteSessions(sessionIds: string[]): void {
    // 활성 세션 확인
    const activeSession = timerService.getActiveSession();
    if (activeSession && sessionIds.includes(activeSession.id)) {
      timerService.stopSession();
    }

    // 각 세션 삭제
    sessionIds.forEach((id) => {
      sessionStorageService.deleteSession(id);
    });

    // 로컬 캐시 업데이트
    this.sessions = this.sessions.filter((s) => !sessionIds.includes(s.id));

    // 리스너 알림
    this.notifyListeners();
  }

  /**
   * 변경 리스너 등록
   */
  addChangeListener(listener: (sessions: WorkSession[]) => void): () => void {
    this.listeners.push(listener);

    // 리스너 제거 함수 반환
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * 리스너들에게 알림
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener([...this.sessions]);
      } catch (error) {
        console.error("SessionManager 리스너 오류:", error);
      }
    });
  }

  /**
   * 오전 9시 일일 리셋 설정
   */
  private setupDailyReset(): void {
    // 초기 체크
    timerService.checkDailyReset();

    // 1시간마다 체크 (1시간 정도의 오차는 허용)
    setInterval(() => {
      timerService.checkDailyReset();
    }, 3600000);
  }

  /**
   * 모든 세션 데이터 내보내기
   */
  exportSessions(): string {
    try {
      return JSON.stringify(this.sessions);
    } catch (error) {
      console.error("세션 데이터 내보내기 실패:", error);
      return "";
    }
  }

  /**
   * 세션 데이터 가져오기
   */
  importSessions(jsonData: string, replaceExisting: boolean = false): boolean {
    try {
      const importedSessions = JSON.parse(jsonData);

      if (!Array.isArray(importedSessions)) {
        return false;
      }

      // 기존 데이터 유지하거나 대체
      if (replaceExisting) {
        // 기존 데이터 대체
        this.sessions = importedSessions;
        sessionStorageService.saveSessions(importedSessions);
      } else {
        // 기존 데이터와 병합
        const allSessions = [...this.sessions];

        importedSessions.forEach((importedSession) => {
          // 중복 세션 확인
          const existingIndex = allSessions.findIndex(
            (s) => s.id === importedSession.id
          );

          if (existingIndex === -1) {
            // 새 세션 추가
            allSessions.push(importedSession);
          }
        });

        this.sessions = allSessions;
        sessionStorageService.saveSessions(allSessions);
      }

      // 리스너 알림
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error("세션 데이터 가져오기 실패:", error);
      return false;
    }
  }

  /**
   * 오늘의 총 작업 시간 가져오기 (분 단위)
   */
  getTodayTotalTime(includeRecording: boolean = false): number {
    const today = new Date();
    const result = this.getSessionsByDate(today, includeRecording);
    return result.totalDuration;
  }

  /**
   * 이번 주 총 작업 시간 가져오기 (분 단위)
   */
  getWeekTotalTime(includeRecording: boolean = false): number {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일

    // 주의 시작일 (일요일)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);

    // 주의 마지막일 (토요일)
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - dayOfWeek));
    endOfWeek.setHours(23, 59, 59, 999);

    const result = this.getSessionsByDateRange(
      startOfWeek,
      endOfWeek,
      includeRecording
    );
    return result.totalDuration;
  }

  /**
   * 월 통계 계산
   */
  calculateMonthStats(
    year: number,
    month: number,
    includeRecording: boolean = false
  ): {
    categoryStats: Record<string, number>;
    weekdayStats: number[];
    totalMonthTime: number;
  } {
    const { sessions } = this.getSessionsByMonth(year, month, includeRecording);

    // 카테고리별 작업 시간 집계
    const categoryStats: Record<string, number> = {};
    let totalMonthTime = 0;

    sessions.forEach((session) => {
      if (!categoryStats[session.taskType]) {
        categoryStats[session.taskType] = 0;
      }
      categoryStats[session.taskType] += session.duration;
      totalMonthTime += session.duration;
    });

    // 요일별 작업 시간 집계
    const weekdayStats: number[] = [0, 0, 0, 0, 0, 0, 0]; // 월-일

    sessions.forEach((session) => {
      const dayOfWeek = session.date.getDay(); // 0=일, 1=월, ..., 6=토
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0=월, ..., 6=일
      weekdayStats[adjustedDay] += session.duration;
    });

    return {
      categoryStats,
      weekdayStats,
      totalMonthTime,
    };
  }

  /**
   * 비정상적으로 종료된 세션 정리
   */
  cleanupIncompleteSessions(): number {
    const sessions = [...this.sessions];
    let fixedCount = 0;

    // 오늘 날짜 (0시 0분 0초)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updatedSessions = sessions.map((session) => {
      // 케이스 1: 활성 상태인데 오늘 날짜가 아닌 세션 정리
      if (
        session.isActive &&
        new Date(session.date).getTime() < today.getTime()
      ) {
        fixedCount++;
        const endTime = new Date(session.startTime);
        // 최대 8시간으로 제한
        const maxDuration = 8 * 60;
        // 실제 지속 시간 계산 (최대 8시간으로 제한)
        const calculatedDuration = Math.min(
          maxDuration,
          session.duration || 60
        );

        endTime.setMinutes(endTime.getMinutes() + calculatedDuration);

        return {
          ...session,
          endTime,
          isActive: false,
          duration: calculatedDuration,
          tags: [...(session.tags || []), "자동완료"],
        };
      }

      // 케이스 2: 비활성 상태인데 endTime이 없는 경우
      if (!session.isActive && !session.endTime) {
        fixedCount++;
        const endTime = new Date(session.startTime);
        endTime.setMinutes(endTime.getMinutes() + (session.duration || 60));

        return {
          ...session,
          endTime,
          tags: [...(session.tags || []), "자동완료"],
        };
      }

      return session;
    });

    // 변경사항이 있으면 저장
    if (fixedCount > 0) {
      console.log(`비정상 종료된 세션 정리 완료: ${fixedCount}개 수정됨`);
      this.sessions = updatedSessions;
      sessionStorageService.saveSessions(updatedSessions);
      this.notifyListeners();
    }

    return fixedCount;
  }
}

// 싱글톤 인스턴스 생성
export const sessionManager = new SessionManager();
