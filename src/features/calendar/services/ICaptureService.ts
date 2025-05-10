import { WorkSession } from "../types";

/**
 * 캡처 서비스 공통 인터페이스
 * BrowserCaptureService와 ElectronSessionAdapter 간의 코드 중복 해결
 */
export interface ICaptureService {
  // 핵심 캡처 기능
  startCapture(options?: any): Promise<boolean>;
  stopCapture(): Promise<boolean>;
  pauseCapture(): Promise<boolean>;
  resumeCapture(): Promise<boolean>;

  // 상태 조회
  isCapturing(): boolean;
  isPaused(): boolean;

  // 리스너 관리
  addChangeListener(listener: () => void): () => void;

  // 세션 조회
  getSession(): WorkSession | null;
}
