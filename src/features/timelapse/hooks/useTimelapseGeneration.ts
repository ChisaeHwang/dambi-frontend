import { useState, useEffect, useCallback } from "react";
import { WindowInfo } from "../../window/types";
import { TimelapseOptions, TimelapseProgress } from "../types";
import {
  timelapseService,
  fileService,
  timelapseStorageService,
} from "../../../services";

// 기본 타임랩스 옵션 정의
const defaultOptions: TimelapseOptions = {
  speedFactor: 10,
  outputQuality: "medium",
  outputFormat: "mp4",
  preserveOriginals: false,
  enabled: true,
  captureDir: "",
};

// window.gtag에 대한 타입 정의 확장
declare global {
  interface Window {
    gtag?: (
      command: string,
      action: string,
      params: Record<string, any>
    ) => void;
  }
}

// TimelapseOptions 인터페이스 확장
declare module "../../timelapse/types" {
  interface TimelapseOptions {
    windowId?: string;
    windowName?: string;
    captureDir?: string;
    fps?: number;
  }
}

/**
 * 타임랩스 생성 기능을 위한 훅
 */
export const useTimelapseGeneration = (
  electronAvailable: boolean,
  activeWindows: WindowInfo[],
  selectedWindowId: string
) => {
  // 상태 관리
  const [outputPath, setOutputPath] = useState<string>("");
  const [saveFolderPath, setSaveFolderPath] = useState<string | null>(
    timelapseStorageService.getPath()
  );
  const [isGeneratingTimelapse, setIsGeneratingTimelapse] =
    useState<boolean>(false);
  const [timelapseProgress, setTimelapseProgress] = useState<TimelapseProgress>(
    {
      status: "start",
      progress: 0,
      stage: "준비",
    }
  );
  const [error, setError] = useState<string | null>(null);

  // 컴포넌트 초기화 시 이벤트 리스너 등록
  useEffect(() => {
    let progressCleanup: (() => void) | null = null;

    if (electronAvailable) {
      // 타임랩스 생성 진행 상황 이벤트 리스너 등록
      progressCleanup = timelapseService.onTimelapseProgress(
        (progress: TimelapseProgress) => {
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
        }
      );
    }

    // 컴포넌트 언마운트 시 이벤트 리스너 정리
    return () => {
      if (progressCleanup) {
        progressCleanup();
      }
    };
  }, [electronAvailable]);

  // 저장 폴더 선택 핸들러
  const selectSaveFolder = useCallback(async () => {
    if (!electronAvailable) {
      console.log(
        "일렉트론 환경이 아닙니다. 폴더 선택 기능을 사용할 수 없습니다."
      );
      return;
    }

    try {
      // 서비스를 통해 폴더 선택 다이얼로그 표시
      const result = await fileService.selectSaveFolder();

      if (result && result.filePaths && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0];
        setSaveFolderPath(selectedPath);

        // 로컬 스토리지에 경로 저장
        timelapseStorageService.savePath(selectedPath);

        console.log(`타임랩스 저장 경로 설정됨: ${selectedPath}`);
        return selectedPath;
      }
    } catch (error) {
      console.error("폴더 선택 오류:", error);
      setError("폴더 선택 중 오류가 발생했습니다.");
    }
    return null;
  }, [electronAvailable]);

  // 타임랩스 생성
  const generateTimelapse = useCallback(
    async (timelapseOptions: TimelapseOptions) => {
      try {
        setIsGeneratingTimelapse(true);
        setError(null);

        if (!electronAvailable) {
          throw new Error(
            "Electron 환경이 아닙니다. 타임랩스 기능을 사용할 수 없습니다."
          );
        }

        const selectedWindow = activeWindows.find(
          (window) => window.id === selectedWindowId
        );

        if (!selectedWindow) {
          throw new Error("선택된 창을 찾을 수 없습니다.");
        }

        const mergedOptions: TimelapseOptions = {
          ...defaultOptions,
          ...timelapseOptions,
          windowId: selectedWindowId,
          windowName: selectedWindow.name || "Unknown",
          captureDir: saveFolderPath || defaultOptions.captureDir,
        };

        console.log("타임랩스 생성 시작:", {
          windowId: mergedOptions.windowId,
          windowName: mergedOptions.windowName,
          fps: mergedOptions.fps,
          speedFactor: mergedOptions.speedFactor,
          outputPath: mergedOptions.outputPath,
          outputQuality: mergedOptions.outputQuality,
        });

        // 테스트를 위한 분석 이벤트 전송
        if (window.gtag) {
          window.gtag("event", "generate_timelapse", {
            event_category: "timelapse",
            event_label: "timelapse_generation",
            value: 1,
            non_interaction: false,
            windowTitle: selectedWindow.name?.slice(0, 50) || "Unknown",
            thumbnailSize: `${mergedOptions.thumbnailWidth}x${mergedOptions.thumbnailHeight}`,
            videoSize: `${mergedOptions.videoWidth}x${mergedOptions.videoHeight}`,
            isScreen: selectedWindow.isScreen || false,
            blurRegions: mergedOptions.blurRegions?.length || 0,
            quality: mergedOptions.outputQuality,
            videoBitrate: mergedOptions.videoBitrate
              ? `${mergedOptions.videoBitrate / 1000000}Mbps`
              : "기본값",
            speedFactor: mergedOptions.speedFactor,
            preserveOriginals: mergedOptions.preserveOriginals,
          });
        }

        // 서비스를 통해 타임랩스 생성
        const path = await timelapseService.generateTimelapse(mergedOptions);
        setOutputPath(path);
        return path;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("타임랩스 생성 오류:", errorMessage);
        setError(errorMessage);
        throw error;
      } finally {
        setIsGeneratingTimelapse(false);
      }
    },
    [electronAvailable, activeWindows, selectedWindowId, saveFolderPath]
  );

  return {
    outputPath,
    saveFolderPath,
    isGeneratingTimelapse,
    timelapseProgress,
    error,
    generateTimelapse,
    selectSaveFolder,
    setSaveFolderPath,
  };
};
