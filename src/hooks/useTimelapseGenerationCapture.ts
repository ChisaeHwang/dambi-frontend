import { useState, useEffect } from "react";

interface NativeImage {
  toDataURL: () => string;
  getSize: () => { width: number; height: number };
}

// 타임랩스 옵션 인터페이스
export interface TimelapseOptions {
  speedFactor: number; // 배속 요소 (3, 6, 9, 20 등)
  outputQuality: "low" | "medium" | "high";
  outputFormat: "mp4" | "gif";
  outputPath?: string; // 출력 경로
  preserveOriginals?: boolean; // 원본 이미지 보존 여부
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
  // 기존 NativeImage 객체 (이전 버전 호환성 유지)
  thumbnail?: NativeImage;
  appIcon?: NativeImage;
  // Base64 인코딩된 썸네일 데이터 (새 버전에서 사용)
  thumbnailDataUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  // 타임스탬프 (캐시 방지)
  timestamp: number;
  // 화면 여부
  isScreen?: boolean;
}

// 일렉트론 환경 확인
const isElectronEnv = () => {
  return (
    typeof window !== "undefined" && typeof window.electron !== "undefined"
  );
};

// 로컬 스토리지 키
const SAVE_PATH_STORAGE_KEY = "timelapse_save_path";

export const useTimelapseGenerationCapture = () => {
  // 상태 관리
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [timelapseOptions, setTimelapseOptions] = useState<TimelapseOptions>({
    speedFactor: 3, // 기본 3배속
    outputQuality: "medium",
    outputFormat: "mp4",
    preserveOriginals: true, // 기본적으로 원본 파일 보존
  });
  const [outputPath, setOutputPath] = useState<string>("");
  const [electronAvailable, setElectronAvailable] = useState<boolean>(false);
  const [selectedWindowId, setSelectedWindowId] = useState<string>("screen:0");
  const [activeWindows, setActiveWindows] = useState<WindowInfo[]>([
    {
      id: "screen:0",
      name: "전체 화면",
      isScreen: true,
      timestamp: Date.now(),
    },
  ]);
  const [isLoadingWindows, setIsLoadingWindows] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // 저장 경로 상태 추가
  const [saveFolderPath, setSaveFolderPath] = useState<string | null>(
    localStorage.getItem(SAVE_PATH_STORAGE_KEY)
  );

  // 활성 창 목록 가져오기
  const fetchActiveWindows = async () => {
    if (!electronAvailable) {
      // Electron 환경이 아닐 때는 전체 화면만 표시
      setActiveWindows([
        {
          id: "screen:0",
          name: "전체 화면",
          isScreen: true,
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    try {
      setIsLoadingWindows(true);
      setError(null);
      // any 타입으로 임시 처리 (Electron IPC 통신이 정확한 타입을 보장하지 않음)
      const windows: any[] = await window.electron.getActiveWindows();

      if (windows && Array.isArray(windows)) {
        console.log("가져온 창 목록:", windows.map((w) => w.name).join(", "));

        // 타임스탬프 보장: Electron에서 타임스탬프가 제공되지 않은 경우 추가
        const windowsWithTimestamp = windows.map((win) => ({
          ...win,
          timestamp: win.timestamp || Date.now(),
        }));

        setActiveWindows(windowsWithTimestamp);
      } else {
        console.error("잘못된 창 목록 형식:", windows);
        setActiveWindows([
          {
            id: "screen:0",
            name: "전체 화면",
            isScreen: true,
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (error) {
      console.error("활성 창 목록 가져오기 실패:", error);
      setError("창 목록을 가져오는 데 실패했습니다.");
      // 오류 발생 시 최소한 전체 화면은 표시
      setActiveWindows([
        {
          id: "screen:0",
          name: "전체 화면",
          isScreen: true,
          timestamp: Date.now(),
        },
      ]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 저장 폴더 선택 핸들러
  const selectSaveFolder = async () => {
    if (!electronAvailable) {
      console.log(
        "일렉트론 환경이 아닙니다. 폴더 선택 기능을 사용할 수 없습니다."
      );
      return;
    }

    try {
      // 일렉트론의 dialog API를 통해 폴더 선택 다이얼로그 표시
      const result = await window.electron.selectSaveFolder();

      if (result && result.filePaths && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0];
        setSaveFolderPath(selectedPath);

        // 로컬 스토리지에 경로 저장
        localStorage.setItem(SAVE_PATH_STORAGE_KEY, selectedPath);

        // timelapseOptions에도 경로 설정
        setTimelapseOptions((prev) => ({
          ...prev,
          outputPath: selectedPath,
        }));

        console.log(`타임랩스 저장 경로 설정됨: ${selectedPath}`);
      }
    } catch (error) {
      console.error("폴더 선택 오류:", error);
      setError("폴더 선택 중 오류가 발생했습니다.");
    }
  };

  // 캡처 시작
  const startCapture = () => {
    setError(null);

    if (electronAvailable) {
      console.log(`선택된 창 ID로 캡처 시작: ${selectedWindowId}`);

      // 선택한 창 이름도 함께 전달
      const selectedWindow = activeWindows.find(
        (window) => window.id === selectedWindowId
      );
      const windowName = selectedWindow ? selectedWindow.name : "";

      console.log(`선택된 창 이름: ${windowName}`);

      // ID와 이름 모두 전달
      window.electron.startCapture(selectedWindowId, windowName);
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

        // 저장 경로가 설정되어 있으면 추가
        if (saveFolderPath) {
          mergedOptions.outputPath = saveFolderPath;
        }

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
    changeTimelapseOptions,
    changeSelectedWindow,
    refreshActiveWindows,
    startCapture,
    stopCapture,
    generateTimelapse,
    saveFolderPath,
    setSaveFolderPath,
    selectSaveFolder,
  };
};
