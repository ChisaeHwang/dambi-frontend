/**
 * 캘린더 관련 유틸리티 함수
 */
import { WorkSession, AppSettings } from "./types";
// 공통 시간 유틸리티 함수 가져오기
import { formatTotalMinutes, formatMinutes } from "../../utils/timeUtils";

/**
 * "녹화" 카테고리인지 확인하는 함수
 * @param session 작업 세션
 * @returns 녹화 카테고리인 경우 true, 아니면 false
 */
export const isRecordingCategory = (session: WorkSession): boolean => {
  return Boolean(session.taskType && session.taskType.toLowerCase() === "녹화");
};

/**
 * "녹화" 카테고리를 제외한 세션 필터링
 * @param sessions 작업 세션 배열
 * @returns "녹화" 카테고리가 아닌 세션만 포함된 배열
 */
export const filterOutRecordingSessions = (
  sessions: WorkSession[]
): WorkSession[] => {
  return sessions.filter((session) => !isRecordingCategory(session));
};

// 기존 formatTotalTime과 formatWorkTime 함수는 제거하고
// 대신 timeUtils.ts의 함수를 export하여 기존 코드와의 호환성 유지
export {
  formatTotalMinutes as formatTotalTime,
  formatMinutes as formatWorkTime,
};

/**
 * Date 객체를 ISO 문자열로 변환 후 다시 Date 객체로 복원하는 함수
 * 로컬 스토리지에 저장할 때 Date 객체가 문자열로 변환되는 문제를 해결
 */
export const reviveDates = <T>(obj: T): T => {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }

  // Date 문자열을 Date 객체로 변환
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key as keyof T];

      // 'date', 'startTime', 'endTime' 속성 확인 및 변환
      if (key === "date" || key === "startTime" || key === "endTime") {
        if (value !== null && typeof value === "string") {
          (obj as any)[key] = new Date(value);
        }
      }
      // 배열 또는 객체인 경우 재귀 처리
      else if (Array.isArray(value)) {
        (obj as any)[key] = value.map((item) => reviveDates(item));
      } else if (value !== null && typeof value === "object") {
        (obj as any)[key] = reviveDates(value);
      }
    }
  }

  return obj;
};

/**
 * 세션 스토리지 서비스
 * 작업 세션 데이터를 로컬 스토리지에 저장하고 불러오는 기능 제공
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
      return reviveDates<WorkSession[]>(parsed);
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
      return reviveDates<WorkSession>(parsed);
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
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    return this.getSessions().filter(
      (session) =>
        new Date(session.date).setHours(0, 0, 0, 0) === targetDate.getTime()
    );
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

// 초기화 - 기존 데이터 클리어 (개발 중에만 사용하고 나중에 제거할 것)
// sessionStorageService.clearAllData();
