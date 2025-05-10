import { ICaptureService } from "./ICaptureService";
import { WorkSession } from "../types";

/**
 * 캡처 서비스 기본 추상 클래스
 * BrowserCaptureService와 ElectronSessionAdapter에서 공통으로 사용되는 기능 구현
 */
export abstract class BaseCaptureService implements ICaptureService {
  protected listeners: Array<() => void> = [];

  // 추상 메서드 - 자식 클래스에서 구현해야 함
  abstract startCapture(options?: any): Promise<boolean>;
  abstract stopCapture(): Promise<boolean>;
  abstract pauseCapture(): Promise<boolean>;
  abstract resumeCapture(): Promise<boolean>;
  abstract isCapturing(): boolean;
  abstract isPaused(): boolean;
  abstract getSession(): WorkSession | null;

  /**
   * 상태 변경 리스너 등록
   * @param listener 리스너 함수
   * @returns 리스너 제거 함수
   */
  addChangeListener(listener: () => void): () => void {
    this.listeners.push(listener);
    // 리스너 제거 함수 반환
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * 등록된 리스너들에게 알림
   */
  protected notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error("리스너 오류:", error);
      }
    });
  }
}
