import { useTimelapseOptions } from "./useTimelapseOptions";
import { useWindowManager } from "../../../features/window";
import { useCaptureState } from "./useCaptureState";
import { useTimelapseGeneration } from "./useTimelapseGeneration";
import { useCallback } from "react";

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
    activeWindows: windowManager.activeWindows,
    isLoadingWindows: windowManager.isLoadingWindows,
    changeSelectedWindow: windowManager.changeSelectedWindow,
    refreshActiveWindows: windowManager.refreshActiveWindows,
    electronAvailable: windowManager.electronAvailable,

    // 옵션 관련
    timelapseOptions: timelapseOptionsManager.timelapseOptions,
    changeTimelapseOptions: timelapseOptionsManager.changeTimelapseOptions,

    // 캡처 관련
    isCapturing: captureState.isCapturing,
    duration: captureState.duration,
    startCapture: captureState.startCapture,
    stopCapture: captureState.stopCapture,

    // 타임랩스 생성 관련
    isGeneratingTimelapse: timelapseGeneration.isGeneratingTimelapse,
    timelapseProgress: timelapseGeneration.timelapseProgress,
    outputPath: timelapseGeneration.outputPath,
    saveFolderPath: timelapseGeneration.saveFolderPath,
    generateTimelapse: timelapseGeneration.generateTimelapse,
    selectSaveFolder: timelapseGeneration.selectSaveFolder,
    setSaveFolderPath: timelapseGeneration.setSaveFolderPath,

    // 오류 처리 통합
    error: combinedError(),
  };
};
