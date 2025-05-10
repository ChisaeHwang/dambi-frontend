import { ICaptureService } from "../ICaptureService";
import { electronSessionAdapter } from "../ElectronSessionAdapter";
import { WorkSession } from "../../types";

/**
 * ElectronSessionAdapter를 ICaptureService 인터페이스에 맞게 어댑터하는 클래스
 */
export class ElectronCaptureAdapter implements ICaptureService {
  /**
   * 캡처 시작
   * @param options 캡처 옵션
   */
  async startCapture(options?: any): Promise<boolean> {
    try {
      const windows = await electronSessionAdapter.getAvailableWindows();
      if (windows && windows.length > 0) {
        const windowId = windows[0].id;
        return electronSessionAdapter.startCapture(windowId, options);
      }
      return false;
    } catch (error) {
      console.error("일렉트론 캡처 시작 오류:", error);
      return false;
    }
  }

  /**
   * 캡처 중지
   */
  stopCapture(): Promise<boolean> {
    return electronSessionAdapter.stopCapture();
  }

  /**
   * 캡처 일시 정지
   */
  pauseCapture(): Promise<boolean> {
    return electronSessionAdapter.pauseCapture();
  }

  /**
   * 캡처 재개
   */
  resumeCapture(): Promise<boolean> {
    return electronSessionAdapter.resumeCapture();
  }

  /**
   * 캡처 중인지 확인
   */
  isCapturing(): boolean {
    return electronSessionAdapter.isCapturing();
  }

  /**
   * 일시 정지 상태인지 확인
   */
  isPaused(): boolean {
    // electronSessionAdapter에는 isPaused 함수가 없으므로 구현 필요
    // 현재 상태에서 최선의 추측을 반환
    const captureData = electronSessionAdapter.getCaptureData();
    return captureData ? captureData.isPaused || false : false;
  }

  /**
   * 상태 변경 리스너 등록
   */
  addChangeListener(listener: () => void): () => void {
    return electronSessionAdapter.addChangeListener(listener);
  }

  /**
   * 현재 세션 조회
   */
  getSession(): WorkSession | null {
    return electronSessionAdapter.getElectronSession();
  }
}

// 싱글톤 인스턴스 생성
export const electronCaptureAdapter = new ElectronCaptureAdapter();
