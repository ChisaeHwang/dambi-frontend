// Electron API에 대한 타입 정의
interface CaptureStatus {
  isCapturing: boolean;
  duration: number;
  error?: string;
}

interface TimelapseOptions {
  speedFactor: number;
  outputQuality: "low" | "medium" | "high";
  outputFormat: "mp4" | "gif";
}

// 창 정보 인터페이스
interface WindowInfo {
  id: string;
  name: string;
  thumbnail?: Electron.NativeImage;
  appIcon?: Electron.NativeImage;
  isScreen?: boolean;
}

// 전역 Window 타입 확장
declare global {
  interface Window {
    electron: {
      // 캡처 관련 API
      getActiveWindows: () => Promise<WindowInfo[]>;
      startCapture: (windowId: string, windowName?: string) => void;
      stopCapture: () => void;
      onCaptureStatus: (
        callback: (status: CaptureStatus) => void
      ) => () => void;

      // 타임랩스 관련 API
      generateTimelapse: (options: TimelapseOptions) => Promise<string>;

      // 창 제어 API
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
    };
    process?: {
      type: string;
    };
    require?: (module: string) => any;
  }
}

export {};
