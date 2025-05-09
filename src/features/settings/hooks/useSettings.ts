import { useCallback, useState, useEffect } from "react";
import { useTimelapseGenerationCapture } from "../../timelapse";
import { AppSettings } from "../../calendar/types";
import { sessionStorageService } from "../../calendar/services/SessionStorageService";

/**
 * 설정 관리 훅
 * - 다양한 설정 관련 훅들을 통합
 */
export const useSettings = () => {
  // 일반 앱 설정 상태
  const [generalSettings, setGeneralSettings] = useState<AppSettings>(
    sessionStorageService.getSettings()
  );

  // 타임랩스 관련 설정 불러오기
  const {
    timelapseOptions,
    changeTimelapseOptions,
    saveFolderPath,
    selectSaveFolder,
  } = useTimelapseGenerationCapture();

  // 초기 설정 로드
  useEffect(() => {
    setGeneralSettings(sessionStorageService.getSettings());
  }, []);

  // 일반 설정 업데이트 핸들러
  const updateGeneralSettings = useCallback(
    (newSettings: Partial<AppSettings>) => {
      setGeneralSettings((prevSettings) => {
        const updatedSettings = { ...prevSettings, ...newSettings };
        sessionStorageService.saveSettings(updatedSettings);
        return updatedSettings;
      });
    },
    []
  );

  // 설정 저장 핸들러
  const saveSettings = useCallback(() => {
    // 일반 설정 저장
    sessionStorageService.saveSettings(generalSettings);
    // 나중에 다른 설정들도 여기에 추가할 수 있음
    return true;
  }, [generalSettings]);

  return {
    // 일반 설정
    generalSettings,
    updateGeneralSettings,

    // 타임랩스 설정
    timelapseOptions,
    changeTimelapseOptions,
    saveFolderPath,
    selectSaveFolder,

    // 공통 기능
    saveSettings,
  };
};
