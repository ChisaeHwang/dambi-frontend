import { useTimelapseOptions } from "./useTimelapseOptions";
import { useWindowManager } from "../../../features/window";
import { useCaptureState } from "./useCaptureState";
import { useTimelapseGeneration } from "./useTimelapseGeneration";
import { useCallback, useEffect } from "react";
import { TimelapseOptions } from "../types";

/**
 * 타임랩스 생성 및 캡처 통합 훅
 * - 여러 개의 특화된 훅을 조합하여 타임랩스 캡처 및 생성 기능 제공
 */
export const useTimelapseGenerationCapture = () => {
  // 창 관리 훅
  const windowManager = useWindowManager();

  // 타임랩스 옵션 훅
  const timelapseOptionsManager = useTimelapseOptions();

  // 캡처 상태 훅
  const captureState = useCaptureState(
    windowManager.selectedWindowId,
    windowManager.electronAvailable,
    windowManager.activeWindows
  );

  // 타임랩스 생성 훅
  const timelapseGeneration = useTimelapseGeneration(
    windowManager.electronAvailable,
    windowManager.activeWindows,
    windowManager.selectedWindowId
  );

  // 리소스 정리를 위한 효과
  useEffect(() => {
    // 컴포넌트가 언마운트될 때 실행됨
    return () => {
      // 여기서 필요한 정리 작업 수행
      // 개별 훅에서 이미 정리를 수행하므로 추가 작업은 필요 없음
      console.log("[useTimelapseGenerationCapture] 리소스 정리 완료");
    };
  }, []);

  // 분리된 오류 처리 통합
  const combinedError = useCallback(() => {
    // 가장 우선순위가 높은 오류 반환
    return (
      captureState.error || timelapseGeneration.error || windowManager.error
    );
  }, [captureState.error, timelapseGeneration.error, windowManager.error]);

  // 기존 API와 호환성 유지를 위한 통합 인터페이스 반환
  return {
    // 창 관련
    selectedWindowId: windowManager.selectedWindowId,
    setSelectedWindowId: windowManager.setSelectedWindowId,
    activeWindows: windowManager.activeWindows,
    isLoadingWindows: windowManager.isLoadingWindows,
    refreshWindows: windowManager.refreshWindows,
    refreshActiveWindows: windowManager.refreshWindows, // 이전 API와 호환성 유지
    changeSelectedWindow: windowManager.changeSelectedWindow,
    electronAvailable: windowManager.electronAvailable,

    // 옵션 관련
    timelapseOptions: timelapseOptionsManager.timelapseOptions,
    changeTimelapseOptions: timelapseOptionsManager.changeTimelapseOptions,
    // 새 API 이름도 제공 (기존 코드에서 호출되지 않음)
    setTimelapseOptions: timelapseOptionsManager.changeTimelapseOptions,
    updateTimelapseOption: <K extends keyof TimelapseOptions>(
      key: K,
      value: TimelapseOptions[K]
    ) =>
      timelapseOptionsManager.changeTimelapseOptions({
        [key]: value,
      } as Partial<TimelapseOptions>),
    resetTimelapseOptions: () =>
      timelapseOptionsManager.changeTimelapseOptions({
        speedFactor: 6,
        outputQuality: "medium",
        outputFormat: "mp4",
        preserveOriginals: true,
        enabled: true,
        blurRegions: [],
      }),

    // 캡처 관련
    isCapturing: captureState.isCapturing,
    duration: captureState.duration,
    startCapture: captureState.startCapture,
    stopCapture: captureState.stopCapture,
    isStatusInitialized: captureState.isStatusInitialized,

    // 타임랩스 생성 관련
    generateTimelapse: timelapseGeneration.generateTimelapse,
    isGeneratingTimelapse: timelapseGeneration.isGeneratingTimelapse,
    isGenerating: timelapseGeneration.isGeneratingTimelapse, // 새 이름도 제공
    timelapseProgress: timelapseGeneration.timelapseProgress,
    progress: timelapseGeneration.timelapseProgress, // 새 이름도 제공
    outputPath: timelapseGeneration.outputPath,
    outputFilePath: timelapseGeneration.outputPath, // 새 이름도 제공
    saveFolderPath: timelapseGeneration.saveFolderPath,
    selectSaveFolder: timelapseGeneration.selectSaveFolder,
    setSaveFolderPath: timelapseGeneration.setSaveFolderPath,
    // 가상의 추가 메서드(구현이 필요할 경우 실제 구현 필요)
    openOutputFile: async (): Promise<boolean> => {
      if (timelapseGeneration.outputPath && windowManager.electronAvailable) {
        try {
          await window.electron.invoke(
            "open-file",
            timelapseGeneration.outputPath
          );
          return true;
        } catch (err) {
          console.error("파일 열기 실패:", err);
          return false;
        }
      }
      return false;
    },
    showOutputInFolder: async (): Promise<boolean> => {
      if (timelapseGeneration.outputPath && windowManager.electronAvailable) {
        try {
          await window.electron.invoke(
            "show-item-in-folder",
            timelapseGeneration.outputPath
          );
          return true;
        } catch (err) {
          console.error("폴더에서 항목 표시 실패:", err);
          return false;
        }
      }
      return false;
    },

    // 오류 처리 통합
    error: combinedError(),
  };
};
