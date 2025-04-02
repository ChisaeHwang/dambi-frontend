import { TimelapseOptions } from "./hooks/useTimelapseGenerationCapture";

// 캡처 상태 인터페이스
interface CaptureStatus {
  isCapturing: boolean;
  duration: number;
  frameCount: number;
  error?: string;
}

// 창 정보 인터페이스
interface WindowInfo {
  id: string;
  name: string;
  thumbnailDataUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  timestamp: number;
  isScreen?: boolean;
}

// 다이얼로그 결과 인터페이스
interface DialogResult {
  canceled: boolean;
  filePaths: string[];
}

// 일렉트론 API 인터페이스
interface ElectronAPI {
  // 창 관리 기능
  minimize: () => Promise<boolean>;
  maximize: () => Promise<boolean>;
  close: () => Promise<boolean>;
  isMaximized: () => Promise<boolean>;

  // 타임랩스 캡처 기능
  getActiveWindows: () => Promise<WindowInfo[]>;
  startCapture: (
    windowId: string,
    windowName: string
  ) => Promise<{ success: boolean; captureDir: string }>;
  stopCapture: () => Promise<{ success: boolean; totalFrames: number }>;
  generateTimelapse: (options: TimelapseOptions) => Promise<string>;

  // 파일 시스템 기능
  selectSaveFolder: () => Promise<DialogResult>;

  // 이벤트 리스너
  onCaptureStatus: (callback: (status: CaptureStatus) => void) => () => void;
}

// 글로벌 window 객체에 일렉트론 API 추가
declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export { ElectronAPI, CaptureStatus, WindowInfo, DialogResult };
