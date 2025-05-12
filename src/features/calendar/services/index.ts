/**
 * 캘린더 관련 서비스 모듈 통합 내보내기
 *
 * 의존성 관리와 역전을 위한 단일 진입점
 */

// 서비스 구현체들
export * from "./timer/DateService";
export * from "./timer/TimerService";
export * from "./session/SessionManager";
export * from "./storage/SessionStorageService";
export * from "./adapters/ElectronSessionAdapter";
export * from "./capture/BrowserCaptureService";

// 새로 추가된 인터페이스와 클래스들
export * from "./capture/ICaptureService";
export * from "./capture/BaseCaptureService";
export * from "./capture/CaptureServiceFactory";
export * from "./adapters/BrowserCaptureAdapter";
export * from "./adapters/ElectronCaptureAdapter";

// 서비스 인터페이스들
export * from "./adapters/ServiceFactory";

// 타입 내보내기
export type { SessionState } from "./timer/TimerService";
export type { TimerEventType, TimerEventListener } from "./timer/TimerService";
export type {
  SessionQueryResult,
  SessionChangeListener,
} from "./session/SessionManager";
