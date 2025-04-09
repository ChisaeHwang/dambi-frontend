/**
 * Electron API와 통신하는 서비스
 * - window.electron API를 직접 호출하는 대신 이 서비스를 통해 접근하여 일관성 및 재사용성 확보
 * - hooks에서 API 호출 로직 분리
 */
import {
  TimelapseOptions,
  TimelapseProgress,
  CaptureStatus,
} from "../features/timelapse/types";
import { WindowInfo } from "../features/window/types";
import { isElectronEnv } from "../types/common";

// Electron 환경 여부 확인
export const isElectronAvailable = (): boolean => {
  return isElectronEnv();
};

// 창 관리 관련 서비스
export const windowService = {
  /**
   * 활성 창 목록 가져오기
   */
  getActiveWindows: async (): Promise<WindowInfo[]> => {
    if (!isElectronAvailable()) {
      console.log("Electron 환경이 아닙니다. 빈 창 목록 반환");
      return [];
    }

    try {
      const windows = await window.electron.getActiveWindows();
      return Array.isArray(windows) ? windows : [];
    } catch (error) {
      console.error("활성 창 목록 가져오기 실패:", error);
      throw new Error("창 목록을 가져오는 데 실패했습니다.");
    }
  },

  /**
   * 창 최소화
   */
  minimize: async (): Promise<boolean> => {
    if (!isElectronAvailable()) return false;
    try {
      return await window.electron.minimize();
    } catch (error) {
      console.error("창 최소화 실패:", error);
      return false;
    }
  },

  /**
   * 창 최대화/복원
   */
  maximize: async (): Promise<boolean> => {
    if (!isElectronAvailable()) return false;
    try {
      return await window.electron.maximize();
    } catch (error) {
      console.error("창 최대화/복원 실패:", error);
      return false;
    }
  },

  /**
   * 창 닫기
   */
  close: async (): Promise<boolean> => {
    if (!isElectronAvailable()) return false;
    try {
      return await window.electron.close();
    } catch (error) {
      console.error("창 닫기 실패:", error);
      return false;
    }
  },

  /**
   * 창 최대화 상태 확인
   */
  isMaximized: async (): Promise<boolean> => {
    if (!isElectronAvailable()) return false;
    try {
      return await window.electron.isMaximized();
    } catch (error) {
      console.error("창 상태 확인 실패:", error);
      return false;
    }
  },
};

// 캡처 관련 서비스
export const captureService = {
  /**
   * 녹화 상태 가져오기
   */
  getRecordingStatus: async (): Promise<{
    isRecording: boolean;
    isCapturing?: boolean;
    duration: number;
  }> => {
    if (!isElectronAvailable()) {
      return { isRecording: false, duration: 0 };
    }

    try {
      return await window.electron.getRecordingStatus();
    } catch (error) {
      console.error("녹화 상태 확인 실패:", error);
      return { isRecording: false, duration: 0 };
    }
  },

  /**
   * 캡처 시작
   */
  startCapture: async (
    windowId: string,
    windowName: string
  ): Promise<{ success: boolean; captureDir?: string; error?: string }> => {
    if (!isElectronAvailable()) {
      console.log("Electron 환경이 아닙니다. 캡처 시작 모의 처리");
      return { success: true, captureDir: "/mock/path" };
    }

    try {
      return await window.electron.startCapture(windowId, windowName);
    } catch (error) {
      console.error("캡처 시작 실패:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  /**
   * 캡처 중지
   */
  stopCapture: async (): Promise<{
    success: boolean;
    totalFrames?: number;
    error?: string;
  }> => {
    if (!isElectronAvailable()) {
      console.log("Electron 환경이 아닙니다. 캡처 중지 모의 처리");
      return { success: true, totalFrames: 0 };
    }

    try {
      return await window.electron.stopCapture();
    } catch (error) {
      console.error("캡처 중지 실패:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  /**
   * 캡처 상태 변경 이벤트 구독
   */
  onCaptureStatus: (
    callback: (status: CaptureStatus) => void
  ): (() => void) => {
    if (!isElectronAvailable()) {
      console.log("Electron 환경이 아닙니다. 캡처 상태 이벤트 모의 처리");
      return () => {}; // 빈 정리 함수
    }

    return window.electron.onCaptureStatus(callback);
  },
};

// 타임랩스 관련 서비스
export const timelapseService = {
  /**
   * 타임랩스 생성
   */
  generateTimelapse: async (options: TimelapseOptions): Promise<string> => {
    if (!isElectronAvailable()) {
      console.log("Electron 환경이 아닙니다. 타임랩스 생성 모의 처리");
      return "/mock/path/timelapse.mp4";
    }

    try {
      return await window.electron.generateTimelapse(options);
    } catch (error) {
      console.error("타임랩스 생성 실패:", error);
      throw error;
    }
  },

  /**
   * 타임랩스 옵션 업데이트
   */
  updateTimelapseOptions: async (
    options: TimelapseOptions
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isElectronAvailable()) {
      console.log("Electron 환경이 아닙니다. 타임랩스 옵션 업데이트 모의 처리");
      return { success: true };
    }

    try {
      return await window.electron.updateTimelapseOptions(options);
    } catch (error) {
      console.error("타임랩스 옵션 업데이트 실패:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  /**
   * 타임랩스 진행 상황 이벤트 구독
   */
  onTimelapseProgress: (
    callback: (progress: TimelapseProgress) => void
  ): (() => void) => {
    if (!isElectronAvailable()) {
      console.log("Electron 환경이 아닙니다. 타임랩스 진행 이벤트 모의 처리");
      return () => {}; // 빈 정리 함수
    }

    return window.electron.onTimelapseProgress(callback);
  },
};

// 파일 시스템 관련 서비스
export const fileService = {
  /**
   * 저장 폴더 선택 다이얼로그 표시
   */
  selectSaveFolder: async (): Promise<{
    canceled: boolean;
    filePaths: string[];
  }> => {
    if (!isElectronAvailable()) {
      console.log("Electron 환경이 아닙니다. 폴더 선택 모의 처리");
      return { canceled: false, filePaths: ["/mock/selected/path"] };
    }

    try {
      return await window.electron.selectSaveFolder();
    } catch (error) {
      console.error("폴더 선택 실패:", error);
      return { canceled: true, filePaths: [] };
    }
  },
};
