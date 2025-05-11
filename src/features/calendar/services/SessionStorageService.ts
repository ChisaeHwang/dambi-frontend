import { WorkSession, AppSettings } from "../types";
import { DateService } from "./DateService";

/**
 * 현재 데이터 스키마 버전
 * 이 값은 WorkSession 인터페이스 구조가 변경될 때마다 증가시켜야 합니다.
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * 버전 관리를 위한 컨테이너 인터페이스
 * 버전 정보와 실제 데이터를 포함합니다.
 */
export interface VersionedData<T> {
  version: number;
  data: T;
}

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
  private readonly SCHEMA_VERSION_KEY = "schema_version";

  /**
   * 모든 작업 세션 가져오기
   */
  getSessions(): WorkSession[] {
    try {
      const data = localStorage.getItem(this.SESSIONS_KEY);
      if (!data) return [];

      // 버전 확인을 위한 파싱 시도
      const parsed = JSON.parse(data);

      // 버전 정보가 있는 새 형식인지 확인
      if (
        parsed &&
        typeof parsed === "object" &&
        "version" in parsed &&
        "data" in parsed
      ) {
        const versionedData = parsed as VersionedData<WorkSession[]>;

        // 필요시 데이터 마이그레이션 수행
        const migratedData = this.migrateSessionsData(versionedData);

        // Date 객체 복원 후 반환
        return DateService.reviveDates<WorkSession[]>(migratedData.data);
      }

      // 이전 형식: 버전 정보 없이 바로 배열 저장된 경우 (기존 데이터 호환성 유지)
      const workSessions = DateService.reviveDates<WorkSession[]>(parsed);

      // 기존 데이터를 새 형식으로 변환하여 저장
      this.saveSessions(workSessions);

      return workSessions;
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
      // 버전 정보를 포함한 객체로 변환하여 저장
      const versionedData: VersionedData<WorkSession[]> = {
        version: CURRENT_SCHEMA_VERSION,
        data: sessions,
      };

      localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(versionedData));
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

      // 버전 확인을 위한 파싱 시도
      const parsed = JSON.parse(data);

      // 버전 정보가 있는 새 형식인지 확인
      if (
        parsed &&
        typeof parsed === "object" &&
        "version" in parsed &&
        "data" in parsed
      ) {
        const versionedData = parsed as VersionedData<WorkSession>;

        // 필요시 데이터 마이그레이션 수행
        const migratedData = this.migrateSingleSessionData(versionedData);

        // Date 객체 복원 후 반환
        return DateService.reviveDates<WorkSession>(migratedData.data);
      }

      // 이전 형식: 버전 정보 없이 바로 객체 저장된 경우 (기존 데이터 호환성 유지)
      const workSession = DateService.reviveDates<WorkSession>(parsed);

      // 기존 데이터를 새 형식으로 변환하여 저장
      if (workSession) {
        this.saveActiveSession(workSession);
      }

      return workSession;
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
        // 버전 정보를 포함한 객체로 변환하여 저장
        const versionedData: VersionedData<WorkSession> = {
          version: CURRENT_SCHEMA_VERSION,
          data: session,
        };

        localStorage.setItem(
          this.ACTIVE_SESSION_KEY,
          JSON.stringify(versionedData)
        );
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
      localStorage.removeItem(this.SCHEMA_VERSION_KEY);
    } catch (error) {
      console.error("데이터 삭제 실패:", error);
    }
  }

  /**
   * 현재 스키마 버전 반환
   * 현재 시스템에서 사용 중인 WorkSession 스키마 버전을 반환합니다.
   */
  getCurrentSchemaVersion(): number {
    return CURRENT_SCHEMA_VERSION;
  }

  /**
   * 세션 데이터 마이그레이션
   * 세션 배열을 버전에 따라 업데이트합니다.
   */
  private migrateSessionsData(
    versionedData: VersionedData<WorkSession[]>
  ): VersionedData<WorkSession[]> {
    const { version, data } = versionedData;

    // 현재 버전과 같거나 더 높은 경우 마이그레이션 불필요
    if (version >= CURRENT_SCHEMA_VERSION) {
      return versionedData;
    }

    // 버전별 마이그레이션 처리
    let migratedData = [...data];

    // 버전 1로 마이그레이션
    if (version < 1) {
      migratedData = this.migrateToV1(migratedData);
    }

    // 필요시 추가 버전 마이그레이션 로직
    // if (version < 2) {
    //   migratedData = this.migrateToV2(migratedData);
    // }

    // 마이그레이션된 데이터 반환
    return {
      version: CURRENT_SCHEMA_VERSION,
      data: migratedData,
    };
  }

  /**
   * 단일 세션 데이터 마이그레이션
   */
  private migrateSingleSessionData(
    versionedData: VersionedData<WorkSession>
  ): VersionedData<WorkSession> {
    const { version, data } = versionedData;

    // 현재 버전과 같거나 더 높은 경우 마이그레이션 불필요
    if (version >= CURRENT_SCHEMA_VERSION) {
      return versionedData;
    }

    // 버전별 마이그레이션 처리
    let migratedData = { ...data };

    // 버전 1로 마이그레이션
    if (version < 1) {
      migratedData = this.migrateSessionToV1(migratedData);
    }

    // 버전 2로 마이그레이션 (예시)
    if (version < 2) {
      migratedData = this.migrateSessionToV2(migratedData);
    }

    // 마이그레이션된 데이터 반환
    return {
      version: CURRENT_SCHEMA_VERSION,
      data: migratedData,
    };
  }

  /**
   * 세션 배열을 버전 1로 마이그레이션
   */
  private migrateToV1(sessions: WorkSession[]): WorkSession[] {
    return sessions.map((session) => this.migrateSessionToV1(session));
  }

  /**
   * 단일 세션을 버전 1로 마이그레이션
   */
  private migrateSessionToV1(session: WorkSession): WorkSession {
    // 필요한 속성이 없으면 추가
    if (!session.taskType && session.title) {
      session.taskType = "기타"; // 기본 카테고리
    }

    if (!session.source) {
      session.source = "manual"; // 기본값
    }

    if (session.isActive === undefined) {
      session.isActive = false;
    }

    if (!session.tags) {
      session.tags = [];
    }

    return session;
  }

  /**
   * 세션 배열을 버전 2로 마이그레이션 (예시)
   * WorkSession 인터페이스에 새 필드가 추가되었을 때의 마이그레이션 예시
   */
  private migrateToV2(sessions: WorkSession[]): WorkSession[] {
    return sessions.map((session) => this.migrateSessionToV2(session));
  }

  /**
   * 단일 세션을 버전 2로 마이그레이션 (예시)
   * 새 필드: priority, location, isRemote 추가 예시
   *
   * 이 함수는 실제 WorkSession 인터페이스가 확장될 때 구현해야 합니다.
   * CURRENT_SCHEMA_VERSION도 2로 변경해야 합니다.
   */
  private migrateSessionToV2(session: WorkSession): WorkSession {
    // WorkSession에 priority 필드가 추가된 경우 (예시)
    // 타입스크립트에서는 아직 실제 인터페이스에 없는 속성이므로 타입 단언 사용
    const updatedSession = session as any;

    // 추가 필드 기본값 설정
    if (updatedSession.priority === undefined) {
      updatedSession.priority = "medium"; // 기본 우선순위
    }

    // 위치 정보 필드가 추가된 경우 (예시)
    if (updatedSession.location === undefined) {
      updatedSession.location = ""; // 빈 문자열로 초기화
    }

    // 원격 작업 여부 필드가 추가된 경우 (예시)
    if (updatedSession.isRemote === undefined) {
      updatedSession.isRemote = false; // 기본값은 원격 아님
    }

    return updatedSession;
  }
}

// 싱글톤 인스턴스 생성
export const sessionStorageService = new SessionStorageService();
