import { WorkSession, AppSettings } from "../types";
import { DateService } from "./DateService";

/**
 * 세션 스토리지 서비스
 * 작업 세션 데이터를 로컬 스토리지에 저장하고 불러오는 기능 제공
 *
 * 단일 책임 원칙(SRP)에 따라 데이터 영속성 관리만 담당
 */
export class SessionStorageService {
  private readonly SESSIONS_KEY = "work_sessions";
  private readonly ACTIVE_SESSION_KEY = "active_session";
  private readonly SETTINGS_KEY = "app_settings";

  /**
   * 모든 작업 세션 가져오기
   */
  getSessions(): WorkSession[] {
    try {
      const data = localStorage.getItem(this.SESSIONS_KEY);
      if (!data) return [];

      const parsed = JSON.parse(data);
      return DateService.reviveDates<WorkSession[]>(parsed);
    } catch (error) {
      console.error("작업 세션 불러오기 실패:", error);
      return [];
    }
  }

  /**
   * 작업 세션 저장하기
   */
  saveSessions(sessions: WorkSession[]): void {
    try {
      localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error("작업 세션 저장 실패:", error);
    }
  }

  /**
   * 활성 세션 가져오기
   */
  getActiveSession(): WorkSession | null {
    try {
      const data = localStorage.getItem(this.ACTIVE_SESSION_KEY);
      if (!data) return null;

      const parsed = JSON.parse(data);
      return DateService.reviveDates<WorkSession>(parsed);
    } catch (error) {
      console.error("활성 세션 불러오기 실패:", error);
      return null;
    }
  }

  /**
   * 활성 세션 저장하기
   */
  saveActiveSession(session: WorkSession | null): void {
    try {
      if (session) {
        localStorage.setItem(this.ACTIVE_SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(this.ACTIVE_SESSION_KEY);
      }
    } catch (error) {
      console.error("활성 세션 저장 실패:", error);
    }
  }

  /**
   * 세션 추가하기
   */
  addSession(session: WorkSession): void {
    const sessions = this.getSessions();
    sessions.push(session);
    this.saveSessions(sessions);

    // 활성 세션인 경우 별도 저장
    if (session.isActive) {
      this.saveActiveSession(session);
    }
  }

  /**
   * 세션 업데이트하기
   */
  updateSession(updatedSession: WorkSession): void {
    const sessions = this.getSessions();
    const index = sessions.findIndex((s) => s.id === updatedSession.id);

    if (index !== -1) {
      sessions[index] = updatedSession;
      this.saveSessions(sessions);

      // 활성 세션 업데이트 확인
      const activeSession = this.getActiveSession();
      if (activeSession && activeSession.id === updatedSession.id) {
        this.saveActiveSession(updatedSession);
      }
    }
  }

  /**
   * 세션 삭제하기
   */
  deleteSession(sessionId: string): void {
    const sessions = this.getSessions();
    const filteredSessions = sessions.filter((s) => s.id !== sessionId);
    this.saveSessions(filteredSessions);

    // 활성 세션 삭제 확인
    const activeSession = this.getActiveSession();
    if (activeSession && activeSession.id === sessionId) {
      this.saveActiveSession(null);
    }
  }

  /**
   * 앱 설정 가져오기
   */
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(this.SETTINGS_KEY);
      if (!data) {
        // 기본 설정 반환
        return {
          language: "ko",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          resetHour: 9, // 기본값은 오전 9시
          categories: ["개발", "디자인", "미팅", "문서", "학습"],
        };
      }

      return JSON.parse(data);
    } catch (error) {
      console.error("설정 불러오기 실패:", error);
      // 오류 시 기본 설정 반환
      return {
        language: "ko",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        resetHour: 9,
        categories: ["개발", "디자인", "미팅", "문서", "학습"],
      };
    }
  }

  /**
   * 앱 설정 저장하기
   */
  saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("설정 저장 실패:", error);
    }
  }

  /**
   * 특정 날짜의 세션 가져오기
   */
  getSessionsByDate(date: Date): WorkSession[] {
    const targetDate = DateService.startOfDay(date);

    return this.getSessions().filter((session) => {
      const sessionDate = new Date(session.date);
      return DateService.isSameDay(sessionDate, targetDate);
    });
  }

  /**
   * 모든 데이터 삭제
   */
  clearAllData(): void {
    try {
      localStorage.removeItem(this.SESSIONS_KEY);
      localStorage.removeItem(this.ACTIVE_SESSION_KEY);
      localStorage.removeItem(this.SETTINGS_KEY);
    } catch (error) {
      console.error("데이터 삭제 실패:", error);
    }
  }
}

// 싱글톤 인스턴스 생성
export const sessionStorageService = new SessionStorageService();
