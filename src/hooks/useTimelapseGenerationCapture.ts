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

// 블러 영역 인터페이스
export interface BlurRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// 타임랩스 옵션 인터페이스
export interface TimelapseOptions {
  speedFactor: number; // 배속 요소 (3, 6, 9, 20 등)
  outputQuality: "low" | "medium" | "high";
  outputFormat: "mp4" | "gif";
  outputPath?: string; // 출력 경로
  preserveOriginals?: boolean; // 원본 이미지 보존 여부
  enabled?: boolean; // 타임랩스 활성화 여부
  blurRegions?: BlurRegion[]; // 블러 처리할 영역 목록
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  videoWidth?: number;
  videoHeight?: number;
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

// 타임랩스 생성 진행 상황 인터페이스
export interface TimelapseProgress {
  status: "start" | "processing" | "complete" | "error";
  progress: number;
  stage: string;
  error?: string;
  outputPath?: string;
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
          enabled: true, // 기본적으로 타임랩스 활성화
          blurRegions: [], // 기본적으로 블러 영역 없음
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
  // 타임랩스 생성 로딩 상태 추가
  const [isGeneratingTimelapse, setIsGeneratingTimelapse] =
    useState<boolean>(false);
  // 타임랩스 생성 진행 상황 추가
  const [timelapseProgress, setTimelapseProgress] = useState<TimelapseProgress>(
    {
      status: "start",
      progress: 0,
      stage: "준비",
    }
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
        // 타임스탬프 추가 및 중복 ID 처리
        const windowsWithTimestamp = windows.map((win, index) => {
          // ID가 없거나 중복될 가능성이 있으면 인덱스 기반 고유 ID 생성
          const id = win.id || `window-${index}-${Date.now()}`;
          return {
            ...win,
            id,
            timestamp: win.timestamp || Date.now(),
          };
        });

        // 창 목록 설정
        setActiveWindows(windowsWithTimestamp);

        // 선택된 창 ID 처리
        if (windowsWithTimestamp.length > 0) {
          // 현재 선택된 창이 새 목록에 존재하는지 확인
          const windowExists = windowsWithTimestamp.some(
            (win) => win.id === currentSelectedId
          );

          if (!windowExists || !currentSelectedId) {
            // 현재 선택된 창이 없거나 더 이상 존재하지 않으면 첫 번째 창 선택
            const firstWindowId = windowsWithTimestamp[0].id;

            // 로컬 상태 및 스토리지 업데이트 (이벤트 없이)
            setSelectedWindowId(firstWindowId);
            saveToLocalStorage(STORAGE_KEYS.SELECTED_WINDOW_ID, firstWindowId);
          }
        } else {
          // 활성 창이 없는 경우 빈 배열 설정
          setActiveWindows([]);
        }
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
    let progressCleanup: (() => void) | null = null;

    if (electronEnv) {
      // 캡처 상태 이벤트 리스너 등록
      cleanup = window.electron.onCaptureStatus((status) => {
        setIsCapturing(status.isCapturing);
        setDuration(status.duration);

        if (status.error) {
          setError(status.error);
        }
      });

      // 타임랩스 생성 진행 상황 이벤트 리스너 등록
      progressCleanup = window.electron.onTimelapseProgress((progress) => {
        setTimelapseProgress(progress);

        // 상태에 따라 isGeneratingTimelapse 상태 갱신
        if (progress.status === "start" || progress.status === "processing") {
          setIsGeneratingTimelapse(true);
        } else {
          setIsGeneratingTimelapse(false);
        }

        // 에러 상태 처리
        if (progress.status === "error" && progress.error) {
          setError(progress.error);
        } else if (progress.status === "complete") {
          setError(null);
        }
      });

      // 활성 창 목록 가져오기
      fetchActiveWindows();

      // 초기화 완료 후 이미 저장된 windowId가 있으면 업데이트
      // 하지만 이벤트는 발생시키지 않음 (다른 컴포넌트도 이 훅을 사용하므로)
      const savedWindowId = loadStringFromLocalStorage(
        STORAGE_KEYS.SELECTED_WINDOW_ID,
        null
      );

      if (savedWindowId && savedWindowId !== selectedWindowId) {
        // 초기 설정 시에는 이벤트 발생 없이 로컬 상태만 업데이트
        setSelectedWindowId(savedWindowId);
      }
    }

    // 컴포넌트 언마운트 시 이벤트 리스너 정리
    return () => {
      if (cleanup) {
        cleanup();
      }
      if (progressCleanup) {
        progressCleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 타임랩스 옵션 변경 핸들러
  const changeTimelapseOptions = (options: Partial<TimelapseOptions>) => {
    setTimelapseOptions((prev) => {
      // 이전 값과 동일한지 비교 (블러 영역의 경우 깊은 비교 필요)
      if (options.blurRegions) {
        const prevBlurRegions = prev.blurRegions || [];
        const newBlurRegions = options.blurRegions;

        // 이전 블러 영역과 새 블러 영역이 같으면 업데이트하지 않음
        if (
          JSON.stringify(prevBlurRegions) === JSON.stringify(newBlurRegions)
        ) {
          // 다른 변경된 옵션이 없다면 이전 상태 그대로 반환
          const hasOtherChanges = Object.keys(options).some(
            (key) =>
              key !== "blurRegions" &&
              options[key as keyof TimelapseOptions] !==
                prev[key as keyof TimelapseOptions]
          );

          if (!hasOtherChanges) {
            return prev; // 변경 사항이 없으면 이전 상태 그대로 반환
          }
        }
      }

      const newOptions = {
        ...prev,
        ...options,
      };

      // 옵션 변경 시 로컬 스토리지에 저장
      saveToLocalStorage(STORAGE_KEYS.TIMELAPSE_OPTIONS, newOptions);

      // 일렉트론 환경이 있는 경우 메인 프로세스에도 설정 변경 전달
      if (electronAvailable && window.electron) {
        // 메인 프로세스에 설정 변경 알림 (일렉트론 IPC 호출)
        try {
          console.log("일렉트론에 타임랩스 옵션 업데이트:", newOptions);
          // 비동기적으로 처리하되 오류는 무시 (사용자 경험 방해 방지)
          window.electron.updateTimelapseOptions?.(newOptions).catch((err) => {
            console.error("타임랩스 옵션 업데이트 오류:", err);
          });
        } catch (error) {
          console.error("타임랩스 옵션 업데이트 중 오류:", error);
        }
      }

      return newOptions;
    });
  };

  // 선택된 창 변경 핸들러
  const changeSelectedWindow = (windowId: string) => {
    // 유효하지 않은 ID 검증
    if (!windowId) {
      console.warn("유효하지 않은 창 ID");
      return;
    }

    // 현재 선택된 창과 같은 경우 중복 처리 방지
    if (windowId === selectedWindowId) {
      return;
    }

    // 활성 창 목록에 존재하는지 확인
    if (
      activeWindows.length > 0 &&
      !activeWindows.some((win) => win.id === windowId)
    ) {
      console.warn("활성 창 목록에 존재하지 않는 ID");
      return;
    }

    // 상태 업데이트 및 로컬 스토리지에 저장
    setSelectedWindowId(windowId);
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
      setIsGeneratingTimelapse(true);

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

        // 현재 선택된 창의 썸네일 해상도 정보 추가
        const selectedWindow = activeWindows.find(
          (window) => window.id === selectedWindowId
        );

        if (selectedWindow) {
          // 썸네일 크기 정보 추가
          mergedOptions.thumbnailWidth = selectedWindow.thumbnailWidth || 320;
          mergedOptions.thumbnailHeight = selectedWindow.thumbnailHeight || 240;

          // 원본 비디오 해상도는 메인 프로세스에서 캡처된 실제 해상도를 사용
          // capture-manager.js에서 메타데이터를 통해 실제 해상도를 가져와 사용
          // 여기서는, 썸네일과 유사한 화면 비율을 기본값으로 사용하고,
          // 메인 프로세스에서 실제 캡처 해상도를 우선 적용

          // 일반적인 화면 해상도를 기본 추정값으로 설정
          if (selectedWindow.isScreen) {
            // 전체 화면 캡처인 경우 (일반적인 모니터 해상도 사용)
            mergedOptions.videoWidth = 1920;
            mergedOptions.videoHeight = 1080;
          } else {
            // 창 캡처인 경우 (창 크기 비율 유지하되 적절한 해상도로 추정)
            const aspectRatio =
              selectedWindow.thumbnailWidth && selectedWindow.thumbnailHeight
                ? selectedWindow.thumbnailWidth / selectedWindow.thumbnailHeight
                : 16 / 9; // 기본 화면 비율

            // 기본 해상도 설정 (메인 프로세스에서 실제 값으로 덮어씀)
            mergedOptions.videoWidth = Math.round(1080 * aspectRatio);
            mergedOptions.videoHeight = 1080;
          }

          console.log("타임랩스 생성 옵션:", {
            thumbnailSize: `${mergedOptions.thumbnailWidth}x${mergedOptions.thumbnailHeight}`,
            videoSize: `${mergedOptions.videoWidth}x${mergedOptions.videoHeight}`,
            isScreen: selectedWindow.isScreen || false,
            blurRegions: mergedOptions.blurRegions?.length || 0,
          });
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
    } finally {
      setIsGeneratingTimelapse(false);
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
    isGeneratingTimelapse,
    timelapseProgress,
  };
};
