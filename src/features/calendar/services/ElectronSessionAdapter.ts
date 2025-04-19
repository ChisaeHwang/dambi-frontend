import { WorkSession } from "../types";
import { timerService } from "./TimerService";

/**
 * 일렉트론 환경 감지 유틸리티 함수
 */
export const isElectronEnvironment = (): boolean => {
  return (
    typeof window !== "undefined" &&
    window.electron !== undefined &&
    typeof window.electron.onCaptureStatus === "function"
  );
};

/**
 * 브라우저 환경 감지 유틸리티 함수
 */
export const isBrowserEnvironment = (): boolean => {
  return !isElectronEnvironment();
};

/**
 * 일렉트론 캡처 상태와 WorkSession을 연동하는 어댑터
 */
export class ElectronSessionAdapter {
  private isActive: boolean = false;
  private captureData: any = null;
  private listeners: Array<() => void> = [];

  constructor() {
    // 일렉트론 환경에서만 초기화
    if (!isElectronEnvironment()) {
      console.log(
        "브라우저 환경에서는 ElectronSessionAdapter가 제한된 기능으로 동작합니다."
      );
      return;
    }

    // 일렉트론 이벤트 리스너 등록
    this.setupElectronListeners();

    // 초기 상태 확인
    this.checkInitialState();
  }

  /**
   * 일렉트론 이벤트 리스너 설정
   */
  private setupElectronListeners(): void {
    if (!window.electron) return;

    // 이벤트 리스너 직접 연결 대신 onCaptureStatus 사용
    if (window.electron.onCaptureStatus) {
      window.electron.onCaptureStatus((status: any) => {
        // 캡처 상태에 따라 처리
        if (status.isCapturing && !this.isActive) {
          // 캡처 시작됨
          this.isActive = true;
          this.captureData = status;

          // 이미 활성화된 세션이 있는지 확인
          const activeSession = timerService.getActiveSession();

          // 활성 세션이 없거나, 활성 세션이 electron 소스가 아니고 녹화 옵션이 활성화되지 않은 경우에만 새 녹화 세션 생성
          if (
            !activeSession ||
            (activeSession.source !== "electron" && !activeSession.isRecording)
          ) {
            // 새 세션 시작
            const title = status.windowTitle || "녹화 세션";
            const taskType = "녹화";
            timerService.startSession(title, taskType, "electron");
          }
        } else if (!status.isCapturing && this.isActive) {
          // 캡처 중지됨
          this.isActive = false;
          this.captureData = null;

          // 작업 세션 종료 - 'electron' 소스 세션만 종료 (사용자가 시작한 세션은 그대로 유지)
          const activeSession = timerService.getActiveSession();
          if (activeSession && activeSession.source === "electron") {
            timerService.stopSession();
          }
        } else {
          // 상태 업데이트
          this.captureData = status;
        }

        // 리스너 알림
        this.notifyListeners();
      });
    }
  }

  /**
   * 초기 상태 확인
   */
  private async checkInitialState(): Promise<void> {
    if (!window.electron || !window.electron.getRecordingStatus) return;

    try {
      const status = await window.electron.getRecordingStatus();

      if (status && (status.isRecording || status.isCapturing)) {
        this.isActive = true;
        this.captureData = status;

        // 이전 세션 확인
        const activeSession = timerService.getActiveSession();

        // 활성 세션이 없거나, 활성 세션이 electron 소스가 아니고 녹화 옵션이 활성화되지 않은 경우에만 새 녹화 세션 생성
        if (
          !activeSession ||
          (activeSession.source !== "electron" && !activeSession.isRecording)
        ) {
          // 새 세션 시작
          const title = "녹화 세션";
          const taskType = "녹화";
          timerService.startSession(title, taskType, "electron");
        }
      }

      // 리스너 알림
      this.notifyListeners();
    } catch (error) {
      console.error("캡처 상태 확인 실패:", error);
    }
  }

  /**
   * 캡처 시작
   */
  async startCapture(windowId: number, options: any = {}): Promise<boolean> {
    if (!window.electron) return false;

    try {
      await window.electron.invoke("start-capture", windowId, options);
      return true;
    } catch (error) {
      console.error("캡처 시작 실패:", error);
      return false;
    }
  }

  /**
   * 캡처 중지
   */
  async stopCapture(): Promise<boolean> {
    if (!window.electron) return false;

    try {
      await window.electron.invoke("stop-capture");
      return true;
    } catch (error) {
      console.error("캡처 중지 실패:", error);
      return false;
    }
  }

  /**
   * 캡처 일시정지
   */
  async pauseCapture(): Promise<boolean> {
    if (!window.electron) return false;

    try {
      await window.electron.invoke("pause-capture");
      return true;
    } catch (error) {
      console.error("캡처 일시정지 실패:", error);
      return false;
    }
  }

  /**
   * 캡처 재개
   */
  async resumeCapture(): Promise<boolean> {
    if (!window.electron) return false;

    try {
      await window.electron.invoke("resume-capture");
      return true;
    } catch (error) {
      console.error("캡처 재개 실패:", error);
      return false;
    }
  }

  /**
   * 현재 캡처 상태 확인
   */
  async getCaptureStatus(): Promise<any> {
    if (!window.electron) return null;

    try {
      return await window.electron.invoke("get-capture-status");
    } catch (error) {
      console.error("캡처 상태 확인 실패:", error);
      return null;
    }
  }

  /**
   * 캡처 활성화 여부 확인
   */
  isCapturing(): boolean {
    return this.isActive;
  }

  /**
   * 캡처 데이터 가져오기
   */
  getCaptureData(): any {
    return this.captureData;
  }

  /**
   * 상태 변경 리스너 등록
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
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      listener();
    });
  }

  /**
   * 현재 일렉트론 세션 가져오기
   */
  getElectronSession(): WorkSession | null {
    return timerService.getActiveSession();
  }

  /**
   * 캡처 가능한 창 목록 가져오기
   */
  async getAvailableWindows(): Promise<any[]> {
    if (!window.electron) return [];

    try {
      return await window.electron.invoke("get-windows");
    } catch (error) {
      console.error("창 목록 가져오기 실패:", error);
      return [];
    }
  }

  /**
   * 일렉트론 환경인지 확인합니다.
   */
  isElectronEnvironment(): boolean {
    return (
      typeof window !== "undefined" &&
      window.electron !== undefined &&
      typeof window.electron.onCaptureStatus === "function"
    );
  }

  /**
   * 녹화 상태 확인
   * @returns {Promise<any>} 현재 녹화 상태 정보
   */
  async getRecordingStatus(): Promise<any> {
    if (!window.electron || !window.electron.getRecordingStatus) {
      return { isRecording: false, isCapturing: false };
    }

    try {
      return await window.electron.getRecordingStatus();
    } catch (error) {
      console.error("녹화 상태 확인 실패:", error);
      return { isRecording: false, isCapturing: false };
    }
  }
}

// 전역에서 접근 가능한 싱글톤 인스턴스
export const electronSessionAdapter = new ElectronSessionAdapter();
