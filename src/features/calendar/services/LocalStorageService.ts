import { WorkSession, AppSettings } from "../types";
import { DateService } from "./DateService";
import { IStorageService } from "./IStorageService";

/**
 * 로컬 스토리지 서비스 구현
 *
 * IStorageService 인터페이스를 구현하며 브라우저의 로컬 스토리지를 사용하여 데이터를 저장합니다.
 * 기존 SessionStorageService에서 기능을 확장하여 Promise 기반 API로 변환했습니다.
 */
export class LocalStorageService implements IStorageService {
  private readonly SESSIONS_KEY = "work_sessions";
  private readonly ACTIVE_SESSION_KEY = "active_session";
  private readonly SETTINGS_KEY = "app_settings";

  /**
   * 로컬 스토리지 용량을 확인하는 내부 메서드
   * 키별로 스토리지 사용량을 계산합니다.
   */
  private getStorageUsage(): Record<string, number> {
    const usage: Record<string, number> = {};
    let totalSize = 0;

    // 모든 키를 순회하며 용량 계산
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || "";
        const size = new Blob([value]).size;
        usage[key] = size;
        totalSize += size;
      }
    }

    usage["__total__"] = totalSize;
    return usage;
  }

  /**
   * 모든 작업 세션 가져오기
   */
  async getSessions(): Promise<WorkSession[]> {
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
  async saveSessions(sessions: WorkSession[]): Promise<void> {
    try {
      localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error("작업 세션 저장 실패:", error);

      // 용량 초과로 인한 오류 발생 시 경고
      if (
        error instanceof DOMException &&
        error.name === "QuotaExceededError"
      ) {
        const usage = this.getStorageUsage();
        const totalKB = Math.round(usage["__total__"] / 1024);
        console.warn(`로컬 스토리지 용량 초과: 현재 사용량 ${totalKB}KB`);

        // 세션 수가 많을 경우 오래된 세션부터 제거하는 로직 추가 가능
        // 현재는 그냥 오류를 던짐
        throw new Error(
          `로컬 스토리지 용량 초과 (${totalKB}KB). IndexedDB로 마이그레이션이 필요합니다.`
        );
      }

      throw error;
    }
  }

  /**
   * 활성 세션 가져오기
   */
  async getActiveSession(): Promise<WorkSession | null> {
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
  async saveActiveSession(session: WorkSession | null): Promise<void> {
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
  async addSession(session: WorkSession): Promise<void> {
    const sessions = await this.getSessions();
    sessions.push(session);
    await this.saveSessions(sessions);

    // 활성 세션인 경우 별도 저장
    if (session.isActive) {
      await this.saveActiveSession(session);
    }
  }

  /**
   * 세션 업데이트하기
   */
  async updateSession(updatedSession: WorkSession): Promise<void> {
    const sessions = await this.getSessions();
    const index = sessions.findIndex((s) => s.id === updatedSession.id);

    if (index !== -1) {
      sessions[index] = updatedSession;
      await this.saveSessions(sessions);

      // 활성 세션 업데이트 확인
      const activeSession = await this.getActiveSession();
      if (activeSession && activeSession.id === updatedSession.id) {
        await this.saveActiveSession(updatedSession);
      }
    }
  }

  /**
   * 세션 삭제하기
   */
  async deleteSession(sessionId: string): Promise<void> {
    const sessions = await this.getSessions();
    const filteredSessions = sessions.filter((s) => s.id !== sessionId);
    await this.saveSessions(filteredSessions);

    // 활성 세션 삭제 확인
    const activeSession = await this.getActiveSession();
    if (activeSession && activeSession.id === sessionId) {
      await this.saveActiveSession(null);
    }
  }

  /**
   * 앱 설정 가져오기
   */
  async getSettings(): Promise<AppSettings> {
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
  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("설정 저장 실패:", error);
    }
  }

  /**
   * 특정 날짜의 세션 가져오기
   */
  async getSessionsByDate(date: Date): Promise<WorkSession[]> {
    const targetDate = DateService.startOfDay(date);
    const sessions = await this.getSessions();

    return sessions.filter((session) => {
      const sessionDate = new Date(session.date);
      return DateService.isSameDay(sessionDate, targetDate);
    });
  }

  /**
   * 모든 데이터 삭제
   */
  async clearAllData(): Promise<void> {
    try {
      localStorage.removeItem(this.SESSIONS_KEY);
      localStorage.removeItem(this.ACTIVE_SESSION_KEY);
      localStorage.removeItem(this.SETTINGS_KEY);
    } catch (error) {
      console.error("데이터 삭제 실패:", error);
    }
  }

  /**
   * 현재 데이터베이스 크기를 바이트 단위로 반환
   */
  async getDatabaseSize(): Promise<number> {
    const usage = this.getStorageUsage();
    return usage["__total__"] || 0;
  }

  /**
   * 저장된 세션 개수 반환
   */
  async getSessionCount(): Promise<number> {
    const sessions = await this.getSessions();
    return sessions.length;
  }
}

// 싱글톤 인스턴스 생성
export const localStorageService = new LocalStorageService();
