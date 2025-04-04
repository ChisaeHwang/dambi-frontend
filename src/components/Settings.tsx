import React, { useEffect } from "react";
import { useTimelapseGenerationCapture } from "../hooks/useTimelapseGenerationCapture";
import SpeedSelector from "./common/SpeedSelector";

const Settings: React.FC = () => {
  const {
    timelapseOptions,
    changeTimelapseOptions,
    saveFolderPath,
    selectSaveFolder,
  } = useTimelapseGenerationCapture();

  // 최초 마운트 여부 확인을 위한 ref
  const mountedRef = React.useRef(false);

  // 배속 변경 핸들러
  const handleSpeedChange = (speed: number) => {
    changeTimelapseOptions({ speedFactor: speed });
  };

  // 설정 저장 핸들러
  const handleSaveSettings = () => {
    // 현재 타임랩스 옵션을 로컬 스토리지에 저장
    // localStorage.setItem("timelapseOptions", JSON.stringify(timelapseOptions));
    // localStorage.setItem("selectedWindowId", selectedWindowId);

    alert("설정이 저장되었습니다.");
  };

  // 저장 폴더 선택 핸들러
  const handleSelectFolder = async () => {
    try {
      await selectSaveFolder();
    } catch (error) {
      console.error("폴더 선택 오류:", error);
    }
  };

  // 속도 옵션
  const speedOptions = [3, 6, 9, 20];

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-normal)] h-screen w-full flex flex-col p-3 overflow-x-hidden overflow-y-auto">
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md p-5 w-[98%] max-w-[1400px] min-w-auto mx-auto mb-5 overflow-visible">
        <h2 className="text-white text-xl mb-4 text-center font-semibold">
          설정
        </h2>

        <div className="mb-4">
          <h3 className="text-white text-base mb-4">타임랩스 설정</h3>

          <SpeedSelector
            selectedSpeed={timelapseOptions.speedFactor}
            speedOptions={speedOptions}
            onSpeedChange={handleSpeedChange}
          />

          <div className="mb-5">
            <label className="block mb-2.5 text-sm">출력 품질</label>
            <div className="flex gap-2.5">
              {["low", "medium", "high"].map((quality) => (
                <button
                  key={quality}
                  className={`py-2 px-4 rounded border-none cursor-pointer transition-colors duration-200 text-sm min-w-20 text-white ${
                    timelapseOptions.outputQuality === quality
                      ? "bg-[var(--primary-color)]"
                      : "bg-[var(--bg-accent)]"
                  }`}
                  onClick={() =>
                    changeTimelapseOptions({ outputQuality: quality as any })
                  }
                >
                  {quality === "low"
                    ? "낮음"
                    : quality === "medium"
                    ? "중간"
                    : "높음"}
                </button>
              ))}
            </div>
          </div>

          {/* 저장 경로 설정 */}
          <div className="mb-5">
            <label className="block mb-2.5 text-sm">타임랩스 저장 위치</label>
            <div className="flex gap-2.5 items-center">
              <input
                type="text"
                value={saveFolderPath || "기본 위치 (내 비디오 폴더)"}
                readOnly
                className="flex-1 py-2.5 px-2.5 rounded border border-[var(--bg-accent)] bg-[var(--input-bg)] text-[var(--text-normal)] text-sm"
              />
              <button
                onClick={handleSelectFolder}
                className="py-2.5 px-4 rounded border-none bg-[var(--bg-accent)] text-white cursor-pointer text-sm whitespace-nowrap"
              >
                폴더 선택
              </button>
            </div>
            <div className="text-xs text-[#a0a0a0] mt-1.5">
              타임랩스 영상이 저장될 폴더를 선택하세요. 기본값은 시스템의 비디오
              폴더입니다.
            </div>
          </div>

          {/* 원본 이미지 보존 설정 */}
          <div className="mb-5">
            <div className="flex justify-between items-center">
              <label className="text-sm">원본 캡처 이미지 보존</label>

              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="preserveOriginals"
                  checked={timelapseOptions.preserveOriginals !== false}
                  onChange={(e) =>
                    changeTimelapseOptions({
                      preserveOriginals: e.target.checked,
                    })
                  }
                  className="hidden"
                />
                <label
                  htmlFor="preserveOriginals"
                  className={`inline-block w-[46px] h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${
                    timelapseOptions.preserveOriginals !== false
                      ? "bg-[var(--primary-color)]"
                      : "bg-[#72767d]"
                  }`}
                >
                  <span
                    className={`block w-[18px] h-[18px] bg-white rounded-full absolute top-[3px] transition-all duration-200 ${
                      timelapseOptions.preserveOriginals !== false
                        ? "left-[25px]"
                        : "left-[3px]"
                    }`}
                  />
                </label>
              </div>
            </div>
            <div className="text-xs text-[#a0a0a0] mt-1.5">
              타임랩스 생성 후 원본 캡처 이미지를 보존할지 여부를 설정합니다.
              보존하면 디스크 공간을 더 많이 사용하지만 필요할 때 다시
              타임랩스를 만들 수 있습니다.
            </div>
          </div>
        </div>

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
