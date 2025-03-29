// Electron API에 대한 타입 정의
interface CaptureStatus {
  isCapturing: boolean;
  frameCount: number;
  duration: number;
  estimatedPlaybackDuration?: number;
}

interface TimelapseOptions {
  fps: number;
  outputQuality: "low" | "medium" | "high";
  outputFormat: "mp4" | "gif";
}

// 전역 Window 타입 확장
declare global {
  interface Window {
    electron: {
      // 타임랩스 관련 API
      startCapture: (interval: number) => void;
      stopCapture: () => void;
      generateTimelapse: (options: TimelapseOptions) => Promise<string>;
      onCaptureStatus: (callback: (status: CaptureStatus) => void) => void;

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
