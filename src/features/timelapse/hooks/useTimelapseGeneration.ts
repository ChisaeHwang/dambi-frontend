import { useState, useEffect, useCallback } from "react";
import {
  STORAGE_KEYS,
  saveToLocalStorage,
  loadStringFromLocalStorage,
} from "../../../utils/localStorage";
import { WindowInfo } from "../../window/types";
import { TimelapseOptions, TimelapseProgress } from "../types";

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
    loadStringFromLocalStorage(STORAGE_KEYS.SAVE_PATH, null)
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
      progressCleanup = window.electron.onTimelapseProgress(
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
      // 일렉트론의 dialog API를 통해 폴더 선택 다이얼로그 표시
      const result = await window.electron.selectSaveFolder();

      if (result && result.filePaths && result.filePaths.length > 0) {
        const selectedPath = result.filePaths[0];
        setSaveFolderPath(selectedPath);

        // 로컬 스토리지에 경로 저장
        saveToLocalStorage(STORAGE_KEYS.SAVE_PATH, selectedPath);

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
        setError(null);
        setIsGeneratingTimelapse(true);

        if (electronAvailable) {
          // 복사본 생성하여 추가 정보 설정
          const mergedOptions = { ...timelapseOptions };

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
            mergedOptions.thumbnailHeight =
              selectedWindow.thumbnailHeight || 240;

            // 원본 비디오 해상도는 메인 프로세스에서 캡처된 실제 해상도를 사용
            // 일반적인 화면 해상도를 기본 추정값으로 설정
            if (selectedWindow.isScreen) {
              // 전체 화면 캡처인 경우 (일반적인 모니터 해상도 사용)
              mergedOptions.videoWidth = 1920;
              mergedOptions.videoHeight = 1080;
            } else {
              // 창 캡처인 경우 (창 크기 비율 유지하되 적절한 해상도로 추정)
              const aspectRatio =
                selectedWindow.thumbnailWidth && selectedWindow.thumbnailHeight
                  ? selectedWindow.thumbnailWidth /
                    selectedWindow.thumbnailHeight
                  : 16 / 9; // 기본 화면 비율

              // 기본 해상도 설정 (메인 프로세스에서 실제 값으로 덮어씀)
              mergedOptions.videoWidth = Math.round(1080 * aspectRatio);
              mergedOptions.videoHeight = 1080;
            }

            // 품질 설정에 따른 해상도 및 비트레이트 조정
            if (mergedOptions.outputQuality === "low") {
              // 낮은 품질: 해상도 감소, 낮은 비트레이트
              mergedOptions.videoWidth = Math.round(
                mergedOptions.videoWidth * 0.6
              );
              mergedOptions.videoHeight = Math.round(
                mergedOptions.videoHeight * 0.6
              );
              mergedOptions.videoBitrate = 1000000; // 1Mbps
            } else if (mergedOptions.outputQuality === "medium") {
              // 중간 품질: 기본 해상도, 중간 비트레이트
              mergedOptions.videoBitrate = 3000000; // 3Mbps
            } else if (mergedOptions.outputQuality === "high") {
              // 높은 품질: 해상도 증가, 높은 비트레이트
              mergedOptions.videoWidth = Math.round(
                mergedOptions.videoWidth * 1.2
              );
              mergedOptions.videoHeight = Math.round(
                mergedOptions.videoHeight * 1.2
              );
              mergedOptions.videoBitrate = 6000000; // 6Mbps
            }

            console.log("타임랩스 생성 옵션:", {
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
    },
    [electronAvailable, activeWindows, selectedWindowId, saveFolderPath]
  );

  return {
    isGeneratingTimelapse,
    timelapseProgress,
    outputPath,
    saveFolderPath,
    error,
    generateTimelapse,
    selectSaveFolder,
    setSaveFolderPath,
  };
};
