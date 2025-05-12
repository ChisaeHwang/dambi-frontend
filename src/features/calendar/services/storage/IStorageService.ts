import { WorkSession, AppSettings } from "../../types";

/**
 * 스토리지 서비스 인터페이스
 *
 * 스토리지 매체에 독립적인 데이터 접근 계층을 정의합니다.
 * 로컬 스토리지, IndexedDB, 서버 백엔드 등 다양한 저장소를 일관된 방식으로 사용할 수 있습니다.
 */
export interface IStorageService {
  // 세션 관련 메소드
  getSessions(): Promise<WorkSession[]>;
  saveSessions(sessions: WorkSession[]): Promise<void>;
  getActiveSession(): Promise<WorkSession | null>;
  saveActiveSession(session: WorkSession | null): Promise<void>;
  addSession(session: WorkSession): Promise<void>;
  updateSession(updatedSession: WorkSession): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  getSessionsByDate(date: Date): Promise<WorkSession[]>;

  // 설정 관련 메소드
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;

  // 데이터 관리
  clearAllData(): Promise<void>;

  // 메타데이터 제공
  getDatabaseSize(): Promise<number>; // 현재 DB 크기(바이트)
  getSessionCount(): Promise<number>; // 세션 개수
}

/**
 * 스토리지 서비스 팩토리 인터페이스
 *
 * 적절한 스토리지 서비스 구현체를 제공합니다.
 */
export interface IStorageServiceFactory {
  getStorageService(): IStorageService;
}

/**
 * 스토리지 유형 열거형
 */
export enum StorageType {
  LOCAL_STORAGE = "localStorage",
  INDEXED_DB = "indexedDB",
  SERVER = "server",
}

/**
 * 스토리지 설정 인터페이스
 */
export interface StorageConfig {
  type: StorageType;
  serverUrl?: string; // SERVER 유형일 경우 필요
  dbName?: string; // INDEXED_DB 유형일 경우 필요
  apiKey?: string; // SERVER 유형일 경우 인증용
}
