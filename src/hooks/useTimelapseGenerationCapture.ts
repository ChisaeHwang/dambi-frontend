import { useState, useEffect } from "react";

// Electron.NativeImage를 대체할 인터페이스 정의
interface NativeImage {
  toDataURL: () => string;
  getSize: () => { width: number; height: number };
}

// 타임랩스 옵션 인터페이스
export interface TimelapseOptions {
  speedFactor: number; // 배속 요소 (3, 6, 9, 20 등)
  outputQuality: "low" | "medium" | "high";
  outputFormat: "mp4" | "gif";
}

// 캡처 상태 인터페이스
export interface CaptureStatus {
  isCapturing: boolean;
  duration: number;
  error?: string;
}

// 창 정보 인터페이스
export interface WindowInfo {
  id: string;
  name: string;
  thumbnail?: NativeImage;
  appIcon?: NativeImage;
  isScreen?: boolean;
}

// 일렉트론 환경 확인
const isElectronEnv = () => {
  return (
    typeof window !== "undefined" && typeof window.electron !== "undefined"
  );
};

export const useTimelapseGenerationCapture = () => {
  // 상태 관리
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [timelapseOptions, setTimelapseOptions] = useState<TimelapseOptions>({
    speedFactor: 3, // 기본 3배속
    outputQuality: "medium",
    outputFormat: "mp4",
  });
  const [outputPath, setOutputPath] = useState<string>("");
  const [electronAvailable, setElectronAvailable] = useState<boolean>(false);
  const [selectedWindowId, setSelectedWindowId] = useState<string>("screen:0");
  const [activeWindows, setActiveWindows] = useState<WindowInfo[]>([
    { id: "screen:0", name: "전체 화면", isScreen: true },
  ]);
  const [isLoadingWindows, setIsLoadingWindows] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 활성 창 목록 가져오기
  const fetchActiveWindows = async () => {
    if (!electronAvailable) {
      // Electron 환경이 아닐 때는 전체 화면만 표시
      setActiveWindows([{ id: "screen:0", name: "전체 화면", isScreen: true }]);
      return;
    }

    try {
      setIsLoadingWindows(true);
      setError(null);
      const windows = await window.electron.getActiveWindows();

      if (windows && Array.isArray(windows)) {
        console.log("가져온 창 목록:", windows.map((w) => w.name).join(", "));
        setActiveWindows(windows);
      } else {
        console.error("잘못된 창 목록 형식:", windows);
        setActiveWindows([
          { id: "screen:0", name: "전체 화면", isScreen: true },
        ]);
      }
    } catch (error) {
      console.error("활성 창 목록 가져오기 실패:", error);
      setError("창 목록을 가져오는 데 실패했습니다.");
      // 오류 발생 시 최소한 전체 화면은 표시
      setActiveWindows([{ id: "screen:0", name: "전체 화면", isScreen: true }]);
    } finally {
      setIsLoadingWindows(false);
    }
  };

  // 컴포넌트 초기화 시 Electron 환경 확인 및 활성 창 목록 가져오기
  useEffect(() => {
    const electronEnv = isElectronEnv();
    setElectronAvailable(electronEnv);

    let cleanup: (() => void) | null = null;

    if (electronEnv) {
      // 캡처 상태 이벤트 리스너 등록
      cleanup = window.electron.onCaptureStatus((status) => {
        setIsCapturing(status.isCapturing);
        setDuration(status.duration);

        if (status.error) {
          setError(status.error);
        }
      });

      // 활성 창 목록 가져오기
      fetchActiveWindows();
    }

    // 컴포넌트 언마운트 시 이벤트 리스너 정리
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  // 타임랩스 옵션 변경 핸들러
  const changeTimelapseOptions = (options: Partial<TimelapseOptions>) => {
    setTimelapseOptions((prev) => ({
      ...prev,
      ...options,
    }));
  };

  // 선택된 창 변경 핸들러
  const changeSelectedWindow = (windowId: string) => {
    setSelectedWindowId(windowId);
  };

  // 활성 창 목록 새로고침
  const refreshActiveWindows = () => {
    fetchActiveWindows();
  };

  // 캡처 시작
  const startCapture = () => {
    setError(null);

    if (electronAvailable) {
      // 선택한 창 ID 전달
      window.electron.startCapture(selectedWindowId);
    } else {
      console.log("모의 환경: 캡처 시작");
      setIsCapturing(true);
    }
  };

  // 캡처 중지
  const stopCapture = () => {
    if (electronAvailable) {
      window.electron.stopCapture();
    } else {
      console.log("모의 환경: 캡처 중지");
      setIsCapturing(false);
    }
  };

  // 타임랩스 생성
  const generateTimelapse = async (
    customOptions?: Partial<TimelapseOptions>
  ) => {
    try {
      setError(null);

      if (electronAvailable) {
        // 기존 옵션과 커스텀 옵션 병합
        const mergedOptions = {
          ...timelapseOptions,
          ...customOptions,
        };

        const path = await window.electron.generateTimelapse(mergedOptions);
        setOutputPath(path);
        return path;
      } else {
        console.log("모의 환경: 타임랩스 생성");
        const mockPath = "/mock/path/timelapse.mp4";
        setOutputPath(mockPath);
        return mockPath;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error("타임랩스 생성 오류:", errorMessage);
      setError(errorMessage);
      throw error;
    }
  };

  return {
    isCapturing,
    duration,
    timelapseOptions,
    outputPath,
    electronAvailable,
    selectedWindowId,
    activeWindows,
    isLoadingWindows,
    error,
    startCapture,
    stopCapture,
    changeTimelapseOptions,
    changeSelectedWindow,
    refreshActiveWindows,
    generateTimelapse,
  };
};
