import { WorkSession } from "../types";
import { sessionStorageService } from "../utils";
import { timerService } from "./TimerService";
import { v4 as uuidv4 } from "uuid";

/**
 * 작업 세션 관리 서비스
 */
export class SessionManager {
  private sessions: WorkSession[] = [];
  private listeners: Array<(sessions: WorkSession[]) => void> = [];

  constructor() {
    // 초기화 시 세션 데이터 로드
    this.loadSessions();

    // 타이머 이벤트 리스너 등록
    timerService.addEventListener((event, session, duration) => {
      if (event === "start" || event === "stop") {
        // 세션 변경 시 데이터 다시 로드
        this.loadSessions();
      }
    });

    // 세션 데이터 정기 갱신 (1분마다)
    setInterval(() => {
      this.loadSessions();
    }, 60000);

    // 오전 9시 리셋 체크
    this.setupDailyReset();
  }

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
   */
  getAllSessions(): WorkSession[] {
    return [...this.sessions];
  }

  /**
   * 특정 날짜의 세션 가져오기
   */
  getSessionsByDate(date: Date): WorkSession[] {
    return this.sessions.filter(
      (session) =>
        session.date.getDate() === date.getDate() &&
        session.date.getMonth() === date.getMonth() &&
        session.date.getFullYear() === date.getFullYear()
    );
  }

  /**
   * 특정 기간의 세션 가져오기
   */
  getSessionsByDateRange(startDate: Date, endDate: Date): WorkSession[] {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return this.sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      return sessionDate >= start && sessionDate <= end;
    });
  }

  /**
   * 특정 월의 세션 가져오기
   */
  getSessionsByMonth(year: number, month: number): WorkSession[] {
    return this.sessions.filter(
      (session) =>
        session.date.getMonth() === month && session.date.getFullYear() === year
    );
  }

  /**
   * 특정 작업 유형의 세션 가져오기
   */
  getSessionsByTaskType(taskType: string): WorkSession[] {
    return this.sessions.filter((session) => session.taskType === taskType);
  }

  /**
   * 특정 카테고리의 세션 가져오기
   */
  getSessionsByCategory(category: string): WorkSession[] {
    return this.sessions.filter((session) => session.taskType === category);
  }

  /**
   * 특정 태그의 세션 가져오기
   */
  getSessionsByTag(tag: string): WorkSession[] {
    return this.sessions.filter((session) => session.tags?.includes(tag));
  }

  /**
   * 활성 세션 가져오기
   */
  getActiveSession(): WorkSession | null {
    return timerService.getActiveSession();
  }

  /**
   * 새 세션 생성
   */
  createSession(
    title: string,
    taskType: string,
    date: Date = new Date(),
    duration: number = 0,
    source: "electron" | "browser" | "manual" = "manual",
    tags: string[] = []
  ): WorkSession {
    // 새 세션 생성
    const newSession: WorkSession = {
      id: uuidv4(),
      date,
      startTime: date,
      endTime: null,
      duration: 0,
      title,
      taskType,
      isRecording: false,
      source,
      isActive: true,
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
   * 작업 세션 시작
   */
  startSession(
    title: string,
    taskType: string,
    source: "electron" | "browser" | "manual" = "manual"
  ): WorkSession {
    return timerService.startSession(title, taskType, source);
  }

  /**
   * 작업 세션 중지
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
   * 세션 업데이트
   */
  updateSession(updatedSession: WorkSession): void {
    // 스토리지에 저장
    sessionStorageService.updateSession(updatedSession);

    // 로컬 캐시 업데이트
    const index = this.sessions.findIndex((s) => s.id === updatedSession.id);
    if (index !== -1) {
      this.sessions[index] = updatedSession;
      this.notifyListeners();
    }
  }

  /**
   * 세션 삭제
   */
  deleteSession(sessionId: string): void {
    // 스토리지에서 삭제
    sessionStorageService.deleteSession(sessionId);

    // 로컬 캐시에서 삭제
    this.sessions = this.sessions.filter((s) => s.id !== sessionId);

    // 리스너 알림
    this.notifyListeners();
  }

  /**
   * 여러 세션 삭제
   */
  deleteSessions(sessionIds: string[]): void {
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
  getTodayTotalTime(): number {
    const today = new Date();
    const todaySessions = this.getSessionsByDate(today);

    return todaySessions.reduce(
      (total, session) => total + session.duration,
      0
    );
  }

  /**
   * 이번 주 총 작업 시간 가져오기 (분 단위)
   */
  getWeekTotalTime(): number {
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

    const weekSessions = this.getSessionsByDateRange(startOfWeek, endOfWeek);

    return weekSessions.reduce((total, session) => total + session.duration, 0);
  }

  /**
   * 월 통계 계산
   */
  calculateMonthStats(
    year: number,
    month: number
  ): {
    categoryStats: Record<string, number>;
    weekdayStats: number[];
    totalMonthTime: number;
  } {
    const monthSessions = this.getSessionsByMonth(year, month);

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
  }
}

// 싱글톤 인스턴스 생성
export const sessionManager = new SessionManager();
