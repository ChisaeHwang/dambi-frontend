import { WorkSession } from "../types";
import { SessionState, TimerEventListener } from "./TimerService";
import { SessionChangeListener, SessionQueryResult } from "./SessionManager";

/**
 * 타이머 서비스 인터페이스
 *
 * 인터페이스 분리 원칙(ISP)에 따라 타이머 서비스의 계약을 정의
 */
export interface ITimerService {
  startSession(
    title: string,
    taskType: string,
    source?: "electron" | "browser" | "manual",
    isRecording?: boolean
  ): WorkSession;
  stopSession(): WorkSession | null;
  pauseSession(): void;
  resumeSession(): void;
  updateActiveSession(session: WorkSession): boolean;
  getCurrentDuration(): number;
  getActiveSession(): WorkSession | null;
  getSessionState(): SessionState;
  setStateChangeCallback(
    callback: ((state: SessionState) => void) | null | undefined
  ): void;
  addEventListener(listener: TimerEventListener): () => void;
  isSessionActive(): boolean;
  isSessionPaused(): boolean;
  cleanup(): void;
  checkDailyReset(): boolean;
}

/**
 * 세션 스토리지 인터페이스
 *
 * 인터페이스 분리 원칙(ISP)에 따라 스토리지 서비스의 계약을 정의
 */
export interface ISessionStorageService {
  getSessions(): WorkSession[];
  saveSessions(sessions: WorkSession[]): void;
  getActiveSession(): WorkSession | null;
  saveActiveSession(session: WorkSession | null): void;
  addSession(session: WorkSession): void;
  updateSession(updatedSession: WorkSession): void;
  deleteSession(sessionId: string): void;
  getSessionsByDate(date: Date): WorkSession[];
  clearAllData(): void;
}

/**
 * 세션 관리자 인터페이스
 *
 * 인터페이스 분리 원칙(ISP)에 따라 세션 관리자의 계약을 정의
 */
export interface ISessionManager {
  getAllSessions(excludeRecordings?: boolean): WorkSession[];
  getSessionsByDate(
    date: Date,
    excludeRecordings?: boolean
  ): SessionQueryResult;
  getSessionsByDateRange(
    startDate: Date,
    endDate: Date,
    excludeRecordings?: boolean
  ): SessionQueryResult;
  getSessionsByTag(tag: string): SessionQueryResult;
  getSessionsByTaskType(taskType: string): SessionQueryResult;
  getSessionState(): SessionState | null;
  getActiveSession(): WorkSession | null;
  addChangeListener(listener: SessionChangeListener): () => void;
  startSession(
    title: string,
    taskType: string,
    source?: "electron" | "browser" | "manual",
    isRecording?: boolean
  ): WorkSession;
  stopSession(): WorkSession | null;
  pauseSession(): void;
  resumeSession(): void;
  updateSession(session: WorkSession): boolean;
  deleteSession(sessionId: string): void;
  createSession(sessionData: Partial<WorkSession>): WorkSession;
  cleanupIncompleteSessions(): void;
  importSessions(jsonData: string, replaceExisting?: boolean): boolean;
  exportSessions(): string;
}

/**
 * 서비스 팩토리
 *
 * 의존관계 역전 원칙(DIP)을 구현하기 위한 팩토리 패턴
 * 구체적인 구현이 아닌 인터페이스에 의존하도록 함
 */
export class ServiceFactory {
  private static timerService: ITimerService | null = null;
  private static sessionStorageService: ISessionStorageService | null = null;
  private static sessionManager: ISessionManager | null = null;

  /**
   * 타이머 서비스 인스턴스 반환
   */
  static getTimerService(): ITimerService {
    if (!this.timerService) {
      // 지연 로딩 (lazy loading) 패턴 적용
      const { timerService } = require("./TimerService");
      this.timerService = timerService;
    }
    return this.timerService!;
  }

  /**
   * 세션 스토리지 서비스 인스턴스 반환
   */
  static getSessionStorageService(): ISessionStorageService {
    if (!this.sessionStorageService) {
      const { sessionStorageService } = require("./SessionStorageService");
      this.sessionStorageService = sessionStorageService;
    }
    return this.sessionStorageService!;
  }

  /**
   * 세션 관리자 인스턴스 반환
   */
  static getSessionManager(): ISessionManager {
    if (!this.sessionManager) {
      const { sessionManager } = require("./SessionManager");
      this.sessionManager = sessionManager;
    }
    return this.sessionManager!;
  }

  /**
   * 테스트용 목(mock) 서비스 주입
   * 테스트 용도로만 사용
   */
  static injectServices(
    timerService?: ITimerService,
    sessionStorageService?: ISessionStorageService,
    sessionManager?: ISessionManager
  ): void {
    if (timerService) this.timerService = timerService;
    if (sessionStorageService)
      this.sessionStorageService = sessionStorageService;
    if (sessionManager) this.sessionManager = sessionManager;
  }

  /**
   * 모든 서비스 초기화
   * 테스트 후 정리 등에 사용
   */
  static resetServices(): void {
    this.timerService = null;
    this.sessionStorageService = null;
    this.sessionManager = null;
  }
}
