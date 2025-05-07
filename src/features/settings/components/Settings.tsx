import React from "react";
import { useSettings } from "../hooks/useSettings";
import SettingsSection from "./SettingsSection";
import TimelapseSettings from "./TimelapseSettings";
import GeneralSettings from "./GeneralSettings";

/**
 * 설정 메인 컴포넌트
 */
const Settings: React.FC = () => {
  const {
    generalSettings,
    updateGeneralSettings,
    timelapseOptions,
    changeTimelapseOptions,
    saveFolderPath,
    selectSaveFolder,
    saveSettings,
  } = useSettings();

  // 저장 폴더 선택 핸들러
  const handleSelectFolder = async () => {
    try {
      await selectSaveFolder();
    } catch (error) {
      console.error("폴더 선택 오류:", error);
    }
  };

  // 설정 저장 핸들러
  const handleSaveSettings = () => {
    saveSettings();
    alert("설정이 저장되었습니다.");
  };

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-normal)] h-screen w-full flex flex-col p-3">
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md p-5 w-[98%] max-w-[1400px] min-w-auto mx-auto mb-5 h-[calc(100vh-30px)] overflow-y-auto">
        <h2 className="text-white text-xl mb-4 text-center font-semibold">
          설정
        </h2>

        <SettingsSection title="일반 설정">
          <GeneralSettings
            settings={generalSettings}
            onChangeSettings={updateGeneralSettings}
          />
        </SettingsSection>

        <SettingsSection title="타임랩스 설정">
          <TimelapseSettings
            timelapseOptions={timelapseOptions}
            saveFolderPath={saveFolderPath}
            onChangeOptions={changeTimelapseOptions}
            onSelectFolder={handleSelectFolder}
          />
        </SettingsSection>

        <div className="text-center">
          <button
            onClick={handleSaveSettings}
            className="py-3 px-6 rounded border-none bg-[var(--primary-color)] text-white cursor-pointer text-sm font-medium transition-colors duration-200 max-w-60 w-full min-w-[180px]"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
