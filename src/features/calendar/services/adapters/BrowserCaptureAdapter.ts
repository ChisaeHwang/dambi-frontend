import { ICaptureService } from "../capture/ICaptureService";
import { browserCaptureService } from "../capture/BrowserCaptureService";
import { WorkSession } from "../../types";

/**
 * BrowserCaptureService를 ICaptureService 인터페이스에 맞게 어댑터하는 클래스
 */
export class BrowserCaptureAdapter implements ICaptureService {
  /**
   * 캡처 시작
   */
  startCapture(options?: any): Promise<boolean> {
    return Promise.resolve(browserCaptureService.startCapture(options));
  }

  /**
   * 캡처 중지
   */
  stopCapture(): Promise<boolean> {
    return Promise.resolve(browserCaptureService.stopCapture());
  }

  /**
   * 캡처 일시 정지
   */
  pauseCapture(): Promise<boolean> {
    return Promise.resolve(browserCaptureService.pauseCapture());
  }

  /**
   * 캡처 재개
   */
  resumeCapture(): Promise<boolean> {
    return Promise.resolve(browserCaptureService.resumeCapture());
  }

  /**
   * 캡처 중인지 확인
   */
  isCapturing(): boolean {
    return browserCaptureService.isCapturing();
  }

  /**
   * 일시 정지 상태인지 확인
   */
  isPaused(): boolean {
    return browserCaptureService.isPaused();
  }

  /**
   * 상태 변경 리스너 등록
   */
  addChangeListener(listener: () => void): () => void {
    return browserCaptureService.addChangeListener(listener);
  }

  /**
   * 현재 세션 조회
   */
  getSession(): WorkSession | null {
    return browserCaptureService.getBrowserSession();
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    // BrowserCaptureService에는 dispose 메서드가 없으므로
    // 필요한 정리 작업이 있다면 여기에 구현
    // 현재는 별도 정리 작업이 필요 없음
  }
}

// 싱글톤 인스턴스 생성
export const browserCaptureAdapter = new BrowserCaptureAdapter();
