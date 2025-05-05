import { WorkSession } from "../types";
import { sessionStorageService } from "./SessionStorageService";
import { timerService, SessionState } from "./TimerService";
import { DateService } from "./DateService";
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
 * 세션 상태 변경 리스너 타입
 */
export type SessionChangeListener = (sessions: WorkSession[]) => void;

/**
 * 작업 세션 관리 서비스
 *
 * 단일 책임: 세션 데이터의 CRUD 및 쿼리 작업 담당
 * 타이머 관련 로직은 TimerService에 위임
 */
export class SessionManager {
  private sessions: WorkSession[] = [];
  private listeners: SessionChangeListener[] = [];
  private sessionState: SessionState | null = null;

  constructor() {
    // 초기화 시 세션 데이터 로드
    this.loadSessions();

    // TimerService의 상태 변경을 구독 (의존성 역전 원칙)
    timerService.setStateChangeCallback(this.handleSessionStateChange);

    // 타이머 이벤트 리스너 등록 - 세션 변경 시 데이터 다시 로드
    timerService.addEventListener((event) => {
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
   * 일일 리셋 체크 설정
   */
  private setupDailyReset(): void {
    // 매 시간마다 리셋 체크
    setInterval(() => {
      timerService.checkDailyReset();
    }, 15 * 60 * 1000); // 15분마다 체크

    // 초기 로드 시 한 번 체크
    timerService.checkDailyReset();
  }

  /**
   * 모든 세션 가져오기
   * @param excludeRecordings 녹화 세션 제외 여부
   */
  getAllSessions(excludeRecordings: boolean = false): WorkSession[] {
    if (!excludeRecordings) {
      return [...this.sessions];
    }

    // 녹화 세션 제외
    return this.sessions.filter((session) => !session.isRecording);
  }

  /**
   * 특정 날짜의 세션 가져오기
   * @param date 조회할 날짜
   * @param excludeRecordings 녹화 세션 제외 여부
   */
  getSessionsByDate(
    date: Date,
    excludeRecordings: boolean = false
  ): SessionQueryResult {
    // 날짜 정규화 (시간 부분 제거)
    const targetDate = DateService.startOfDay(date);

    // 필터링
    let filteredSessions = this.sessions.filter((session) => {
      const sessionDate = DateService.startOfDay(new Date(session.date));
      return DateService.isSameDay(sessionDate, targetDate);
    });

    // 녹화 세션 제외 옵션 처리
    if (excludeRecordings) {
      filteredSessions = filteredSessions.filter(
        (session) => !session.isRecording
      );
    }

    // 총 시간 계산
    const totalDuration = filteredSessions.reduce(
      (sum, session) => sum + session.duration,
      0
    );

    return {
      sessions: filteredSessions,
      totalDuration,
      count: filteredSessions.length,
    };
  }

  /**
   * 날짜 범위로 세션 가져오기
   * @param startDate 시작 날짜
   * @param endDate 종료 날짜
   * @param excludeRecordings 녹화 세션 제외 여부
   */
  getSessionsByDateRange(
    startDate: Date,
    endDate: Date,
    excludeRecordings: boolean = false
  ): SessionQueryResult {
    // 날짜 정규화
    const start = DateService.startOfDay(startDate);
    const end = DateService.endOfDay(endDate);

    // 필터링
    let filteredSessions = this.sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      return sessionDate >= start && sessionDate <= end;
    });

    // 녹화 세션 제외 옵션 처리
    if (excludeRecordings) {
      filteredSessions = filteredSessions.filter(
        (session) => !session.isRecording
      );
    }

    // 총 시간 계산
    const totalDuration = filteredSessions.reduce(
      (sum, session) => sum + session.duration,
      0
    );

    return {
      sessions: filteredSessions,
      totalDuration,
      count: filteredSessions.length,
    };
  }

  /**
   * 태그로 세션 검색
   * @param tag 검색할 태그
   */
  getSessionsByTag(tag: string): SessionQueryResult {
    const filteredSessions = this.sessions.filter((session) =>
      session.tags?.includes(tag)
    );

    const totalDuration = filteredSessions.reduce(
      (sum, session) => sum + session.duration,
      0
    );

    return {
      sessions: filteredSessions,
      totalDuration,
      count: filteredSessions.length,
    };
  }

  /**
   * 작업 유형별 세션 가져오기
   * @param taskType 작업 유형
   */
  getSessionsByTaskType(taskType: string): SessionQueryResult {
    const filteredSessions = this.sessions.filter(
      (session) => session.taskType === taskType
    );

    const totalDuration = filteredSessions.reduce(
      (sum, session) => sum + session.duration,
      0
    );

    return {
      sessions: filteredSessions,
      totalDuration,
      count: filteredSessions.length,
    };
  }

  /**
   * 현재 세션 상태 가져오기
   */
  getSessionState(): SessionState | null {
    return this.sessionState || timerService.getSessionState();
  }

  /**
   * 활성 세션 가져오기
   */
  getActiveSession(): WorkSession | null {
    return timerService.getActiveSession();
  }

  /**
   * 세션 변경 리스너 등록
   * @param listener 리스너 콜백 함수
   */
  addChangeListener(listener: SessionChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * 상태 변경 알림 전송
   */
  private notifyListeners(): void {
    if (this.listeners.length > 0) {
      const sessionsCopy = [...this.sessions];
      this.listeners.forEach((listener) => {
        try {
          listener(sessionsCopy);
        } catch (error) {
          console.error("세션 변경 리스너 오류:", error);
        }
      });
    }
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
    const session = timerService.startSession(
      title,
      taskType,
      source,
      isRecording
    );

    // 세션 목록 갱신
    this.loadSessions();

    return session;
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
  updateSession(session: WorkSession): boolean {
    // 활성 세션인지 확인
    const activeSession = timerService.getActiveSession();

    // 활성 세션이면 TimerService를 통해 업데이트
    if (activeSession && activeSession.id === session.id) {
      const updated = timerService.updateActiveSession(session);

      // 세션 목록 갱신
      this.loadSessions();

      return updated;
    }

    // 아니면 직접 스토리지 서비스로 업데이트
    sessionStorageService.updateSession(session);

    // 세션 목록 갱신
    this.loadSessions();

    return true;
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
   * 새 세션 생성 (타이머 시작 없이)
   */
  createSession(sessionData: Partial<WorkSession>): WorkSession {
    const now = new Date();
    const newSession: WorkSession = {
      id: sessionData.id || uuidv4(),
      date: sessionData.date || DateService.startOfDay(now),
      duration: sessionData.duration || 0,
      title: sessionData.title || "새 세션",
      taskType: sessionData.taskType || "기타",
      startTime: sessionData.startTime || now,
      endTime: sessionData.endTime || now,
      isActive: false,
      isRecording: sessionData.isRecording || false,
      source: sessionData.source || "manual",
      tags: sessionData.tags || [],
    };

    // 스토리지에 저장
    sessionStorageService.addSession(newSession);

    // 세션 목록 갱신
    this.loadSessions();

    return newSession;
  }

  /**
   * 미완료 세션 정리
   * 브라우저 충돌 등으로 종료되지 않은 세션 처리
   */
  cleanupIncompleteSessions(): void {
    // 현재 활성 세션 가져오기
    const activeSession = timerService.getActiveSession();

    // 활성 세션이 있고 종료되지 않은 상태라면 정리하지 않음
    if (activeSession && activeSession.isActive) {
      return;
    }

    // 모든 세션 불러오기
    const allSessions = sessionStorageService.getSessions();

    // 종료되지 않은 세션 찾기
    const incompleteSessions = allSessions.filter(
      (session) => session.isActive && !session.endTime
    );

    if (incompleteSessions.length === 0) {
      return;
    }

    // 미완료 세션 종료 처리
    const updatedSessions = allSessions.map((session) => {
      if (session.isActive && !session.endTime) {
        return {
          ...session,
          isActive: false,
          endTime: new Date(),
          tags: [...(session.tags || []), "자동종료"],
        };
      }
      return session;
    });

    // 업데이트된 세션 저장
    sessionStorageService.saveSessions(updatedSessions);

    // 활성 세션 초기화
    sessionStorageService.saveActiveSession(null);

    // 세션 목록 갱신
    this.loadSessions();
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

      // Date 객체 복원
      const parsedSessions =
        DateService.reviveDates<WorkSession[]>(importedSessions);

      // 기존 데이터 유지하거나 대체
      if (replaceExisting) {
        // 기존 데이터 대체
        sessionStorageService.saveSessions(parsedSessions);
      } else {
        // 기존 데이터와 병합
        const existingSessions = sessionStorageService.getSessions();
        const allSessions = [...existingSessions];

        parsedSessions.forEach((importedSession) => {
          // 중복 세션 확인
          const existingIndex = allSessions.findIndex(
            (s) => s.id === importedSession.id
          );

          if (existingIndex === -1) {
            // 새 세션 추가
            allSessions.push(importedSession);
          }
        });

        sessionStorageService.saveSessions(allSessions);
      }

      // 세션 목록 갱신
      this.loadSessions();

      return true;
    } catch (error) {
      console.error("세션 데이터 가져오기 실패:", error);
      return false;
    }
  }

  /**
   * 세션 데이터 내보내기
   */
  exportSessions(): string {
    return JSON.stringify(this.sessions);
  }
}

// 싱글톤 인스턴스 생성
export const sessionManager = new SessionManager();
