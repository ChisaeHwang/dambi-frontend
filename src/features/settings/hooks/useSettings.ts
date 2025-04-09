import { useCallback } from "react";
import { useTimelapseGenerationCapture } from "../../timelapse";

/**
 * 설정 관리 훅
 * - 다양한 설정 관련 훅들을 통합
 */
export const useSettings = () => {
  // 타임랩스 관련 설정 불러오기
  const {
    timelapseOptions,
    changeTimelapseOptions,
    saveFolderPath,
    selectSaveFolder,
  } = useTimelapseGenerationCapture();

  // 설정 저장 핸들러
  const saveSettings = useCallback(() => {
    // 현재는 별도 저장 로직이 필요 없음 (옵션 변경 시 자동 저장됨)
    return true;
  }, []);

  return {
    // 타임랩스 설정
    timelapseOptions,
    changeTimelapseOptions,
    saveFolderPath,
    selectSaveFolder,

    // 공통 기능
    saveSettings,
  };
};
