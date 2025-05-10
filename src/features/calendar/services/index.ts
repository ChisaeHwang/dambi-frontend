/**
 * 캘린더 관련 서비스 모듈 통합 내보내기
 *
 * 의존성 관리와 역전을 위한 단일 진입점
 */

// 서비스 구현체들
export * from "./DateService";
export * from "./TimerService";
export * from "./SessionManager";
export * from "./SessionStorageService";
export * from "./ElectronSessionAdapter";
export * from "./BrowserCaptureService";

// 새로 추가된 인터페이스와 클래스들
export * from "./ICaptureService";
export * from "./BaseCaptureService";
export * from "./CaptureServiceFactory";
export * from "./adapters/BrowserCaptureAdapter";
export * from "./adapters/ElectronCaptureAdapter";

// 서비스 인터페이스들
export * from "./ServiceFactory";

// 타입 내보내기
export type { SessionState } from "./TimerService";
export type { TimerEventType, TimerEventListener } from "./TimerService";
export type {
  SessionQueryResult,
  SessionChangeListener,
} from "./SessionManager";
