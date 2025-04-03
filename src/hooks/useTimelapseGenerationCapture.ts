import { useState, useEffect } from "react";
import {
  STORAGE_KEYS,
  saveToLocalStorage,
  loadFromLocalStorage,
  loadStringFromLocalStorage,
} from "../utils/localStorage";

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

export const useTimelapseGenerationCapture = () => {
  // 상태 관리
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [timelapseOptions, setTimelapseOptions] = useState<TimelapseOptions>(
    () => {
      // 로컬 스토리지에서 설정 불러오기
      return loadFromLocalStorage<TimelapseOptions>(
        STORAGE_KEYS.TIMELAPSE_OPTIONS,
        {
          speedFactor: 3, // 기본 3배속
          outputQuality: "medium",
          outputFormat: "mp4",
          preserveOriginals: true, // 기본적으로 원본 파일 보존
        }
      );
    }
  );
  const [outputPath, setOutputPath] = useState<string>("");
  const [electronAvailable, setElectronAvailable] = useState<boolean>(false);
  const [selectedWindowId, setSelectedWindowId] = useState<string>(() => {
    // 로컬 스토리지에서 선택된 창 ID 불러오기
    const savedWindowId = loadStringFromLocalStorage(
      STORAGE_KEYS.SELECTED_WINDOW_ID,
      null
    );
    // null이 반환될 경우 빈 문자열 사용 (전체 화면 옵션 제거)
    return savedWindowId || "";
  });
  const [activeWindows, setActiveWindows] = useState<WindowInfo[]>(() => {
    // 로컬 스토리지에서 활성 창 목록 불러오기
    return loadFromLocalStorage<WindowInfo[]>(STORAGE_KEYS.ACTIVE_WINDOWS, []);
  });
  const [isLoadingWindows, setIsLoadingWindows] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // 저장 경로 상태 추가
  const [saveFolderPath, setSaveFolderPath] = useState<string | null>(
    loadStringFromLocalStorage(STORAGE_KEYS.SAVE_PATH, null)
  );

  // activeWindows 상태가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.ACTIVE_WINDOWS, activeWindows);
  }, [activeWindows]);

  // 활성 창 목록 가져오기
  const fetchActiveWindows = async () => {
    if (!electronAvailable) {
      // Electron 환경이 아닐 때는 빈 배열 반환
      setActiveWindows([]);
      return;
    }

    try {
      setIsLoadingWindows(true);
      setError(null);

      // 현재 선택된 창 ID 저장 (새로고침 후에도 유지하기 위해)
      const currentSelectedId = selectedWindowId;

      // any 타입으로 임시 처리 (Electron IPC 통신이 정확한 타입을 보장하지 않음)
      const windows: any[] = await window.electron.getActiveWindows();

      if (windows && Array.isArray(windows)) {
        console.log("가져온 창 목록:", windows.map((w) => w.name).join(", "));

        // 타임스탬프 보장: Electron에서 타임스탬프가 제공되지 않은 경우 추가
        const windowsWithTimestamp = windows.map((win) => ({
          ...win,
          timestamp: win.timestamp || Date.now(),
        }));

        // 실제 창 목록만 사용 (전체 화면 옵션 제거)
        const allWindows = [...windowsWithTimestamp];

        if (allWindows.length === 0) {
          console.log("사용 가능한 창이 없습니다.");
          setActiveWindows([]);
          return;
        }

        // 현재 선택된 창이 새 목록에 존재하는지 확인
        const windowExists = allWindows.some(
          (win) => win.id === currentSelectedId
        );

        if (!windowExists && currentSelectedId) {
          console.log(
            "선택한 창이 더 이상 존재하지 않습니다. 첫 번째 창으로 선택합니다."
          );
          // 기존 선택한 창이 없으면 첫 번째 창으로 설정하고 로컬 스토리지 업데이트
          const firstWindowId = allWindows[0].id;
          saveToLocalStorage(STORAGE_KEYS.SELECTED_WINDOW_ID, firstWindowId);
          setSelectedWindowId(firstWindowId);
        } else if (currentSelectedId) {
          // 이미 선택된 창이 있고 그것이 새 목록에 존재하면 유지
          console.log("선택한 창 유지:", currentSelectedId);
          saveToLocalStorage(
            STORAGE_KEYS.SELECTED_WINDOW_ID,
            currentSelectedId
          );
          setSelectedWindowId(currentSelectedId);
        } else if (allWindows.length > 0) {
          // 선택된 창이 없을 경우 첫 번째 창 선택
          const firstWindowId = allWindows[0].id;
          console.log("창이 선택되지 않아 첫 번째 창으로 설정:", firstWindowId);
          saveToLocalStorage(STORAGE_KEYS.SELECTED_WINDOW_ID, firstWindowId);
          setSelectedWindowId(firstWindowId);
        }

        setActiveWindows(allWindows);
      } else {
        console.error("잘못된 창 목록 형식:", windows);
        setActiveWindows([]);
      }
    } catch (error) {
      console.error("활성 창 목록 가져오기 실패:", error);
      setError("창 목록을 가져오는 데 실패했습니다.");
      setActiveWindows([]);
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
    setTimelapseOptions((prev) => {
      const newOptions = {
        ...prev,
        ...options,
      };

      // 옵션 변경 시 로컬 스토리지에 저장
      saveToLocalStorage(STORAGE_KEYS.TIMELAPSE_OPTIONS, newOptions);

      return newOptions;
    });
  };

  // 선택된 창 변경 핸들러
  const changeSelectedWindow = (windowId: string) => {
    setSelectedWindowId(windowId);

    // 선택된 창 변경 시 로컬 스토리지에 저장
    saveToLocalStorage(STORAGE_KEYS.SELECTED_WINDOW_ID, windowId);
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
        saveToLocalStorage(STORAGE_KEYS.SAVE_PATH, selectedPath);

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

      try {
        // ID와 이름 모두 전달하고 그 결과를 로그로 출력
        window.electron
          .startCapture(selectedWindowId, windowName)
          .then((result: any) => {
            console.log("캡처 시작 결과:", result);
            if (!result.success) {
              setError(result.error || "캡처 시작 실패");
            }
          })
          .catch((err: Error) => {
            console.error("캡처 시작 오류:", err);
            setError(err.message || "캡처 시작 중 오류 발생");
          });
      } catch (error) {
        console.error("캡처 시작 예외:", error);
        setError(String(error));
      }
    } else {
      console.log("모의 환경: 캡처 시작");
      setIsCapturing(true);
    }
  };

  // 캡처 중지
  const stopCapture = () => {
    if (electronAvailable) {
      console.log("캡처 중지 요청");
      window.electron
        .stopCapture()
        .then((result: any) => {
          console.log("캡처 중지 결과:", result);
          if (!result.success) {
            setError(result.error || "캡처 중지 실패");
          }
        })
        .catch((err: Error) => {
          console.error("캡처 중지 오류:", err);
          setError(err.message || "캡처 중지 중 오류 발생");
        });
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
