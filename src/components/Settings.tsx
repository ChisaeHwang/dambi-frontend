import React from "react";
import { useTimelapseGenerationCapture } from "../features/timelapse";
import SpeedSelector from "./common/SpeedSelector";

const Settings: React.FC = () => {
  const {
    timelapseOptions,
    changeTimelapseOptions,
    saveFolderPath,
    selectSaveFolder,
  } = useTimelapseGenerationCapture();

  // 배속 변경 핸들러
  const handleSpeedChange = (speed: number) => {
    changeTimelapseOptions({ speedFactor: speed });
  };

  // 설정 저장 핸들러
  const handleSaveSettings = () => {
    // 설정 저장 로직은 useTimelapseGenerationCapture 내부에서 처리됨
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
    <div className="bg-[var(--bg-primary)] text-[var(--text-normal)] h-screen w-full flex flex-col p-3">
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md p-5 w-[98%] max-w-[1400px] min-w-auto mx-auto mb-5 h-[calc(100vh-30px)] overflow-y-auto">
        <h2 className="text-white text-xl mb-4 text-center font-semibold">
          설정
        </h2>

        <div className="mb-4">
          <h3 className="text-white text-base mb-4">타임랩스 설정</h3>

          {/* 타임랩스 ON/OFF 토글 */}
          <div className="mb-5">
            <div className="flex justify-between items-center">
              <label htmlFor="timelapseEnabled" className="text-sm">
                타임랩스 활성화
              </label>

              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="timelapseEnabled"
                  checked={timelapseOptions.enabled !== false}
                  onChange={(e) =>
                    changeTimelapseOptions({
                      enabled: e.target.checked,
                    })
                  }
                  className="hidden"
                />
                <label
                  htmlFor="timelapseEnabled"
                  className={`inline-block w-[46px] h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${
                    timelapseOptions.enabled !== false
                      ? "bg-[var(--primary-color)]"
                      : "bg-[#72767d]"
                  }`}
                  aria-label={
                    timelapseOptions.enabled !== false
                      ? "활성화됨"
                      : "비활성화됨"
                  }
                >
                  <span
                    className={`block w-[18px] h-[18px] bg-white rounded-full absolute top-[3px] transition-all duration-200 ${
                      timelapseOptions.enabled !== false
                        ? "left-[25px]"
                        : "left-[3px]"
                    }`}
                  />
                </label>
              </div>
            </div>
            <div className="text-xs text-[#a0a0a0] mt-1.5">
              타임랩스 기능을 켜거나 끕니다. 끄면 작업 중 화면 캡처가 저장되지
              않습니다.
            </div>
          </div>

          <SpeedSelector
            selectedSpeed={timelapseOptions.speedFactor}
            speedOptions={speedOptions}
            onSpeedChange={handleSpeedChange}
          />

          <div className="mb-5">
            <div className="block mb-2.5 text-sm">출력 품질</div>
            <div
              className="flex gap-2.5"
              role="radiogroup"
              aria-label="출력 품질"
            >
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
                  role="radio"
                  aria-checked={timelapseOptions.outputQuality === quality}
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
            <label htmlFor="savePath" className="block mb-2.5 text-sm">
              타임랩스 저장 위치
            </label>
            <div className="flex gap-2.5 items-center">
              <input
                id="savePath"
                type="text"
                value={saveFolderPath || "기본 위치 (내 비디오 폴더)"}
                readOnly
                className="flex-1 py-2.5 px-2.5 rounded border border-[var(--bg-accent)] bg-[var(--input-bg)] text-[var(--text-normal)] text-sm"
              />
              <button
                onClick={handleSelectFolder}
                className="py-2.5 px-4 rounded border-none bg-[var(--bg-accent)] text-white cursor-pointer text-sm whitespace-nowrap"
                aria-label="저장 폴더 선택하기"
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
              <label htmlFor="preserveOriginals" className="text-sm">
                원본 캡처 이미지 보존
              </label>

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
                  aria-label={
                    timelapseOptions.preserveOriginals !== false
                      ? "활성화됨"
                      : "비활성화됨"
                  }
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
