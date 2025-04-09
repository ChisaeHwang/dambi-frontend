import React from "react";
import { TimelapseOptions } from "../../timelapse/types";
import SpeedSelector from "../../../components/common/SpeedSelector";

interface TimelapseSettingsProps {
  timelapseOptions: TimelapseOptions;
  saveFolderPath: string | null;
  onChangeOptions: (options: Partial<TimelapseOptions>) => void;
  onSelectFolder: () => Promise<void>;
}

/**
 * 타임랩스 설정 컴포넌트
 */
const TimelapseSettings: React.FC<TimelapseSettingsProps> = ({
  timelapseOptions,
  saveFolderPath,
  onChangeOptions,
  onSelectFolder,
}) => {
  // 배속 변경 핸들러
  const handleSpeedChange = (speed: number) => {
    onChangeOptions({ speedFactor: speed });
  };

  // 속도 옵션
  const speedOptions = [3, 6, 9, 20];

  return (
    <>
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
                onChangeOptions({
                  enabled: e.target.checked,
                })
              }
              className="hidden"
            />
            <label
              htmlFor="timelapseEnabled"
              className="flex items-center cursor-pointer w-12 h-6 rounded-full relative bg-[var(--bg-accent)] transition-colors duration-300"
            >
              <span
                className={`toggle-dot absolute transition-transform duration-300 left-1 top-1 bg-white w-4 h-4 rounded-full ${
                  timelapseOptions.enabled !== false ? "translate-x-6" : ""
                }`}
              ></span>
            </label>
          </div>
        </div>
      </div>

      {/* 배속 설정 */}
      <div className="mb-5">
        <div className="block mb-2.5 text-sm">타임랩스 배속</div>
        <SpeedSelector
          speedOptions={speedOptions}
          selectedSpeed={timelapseOptions.speedFactor}
          onSpeedChange={handleSpeedChange}
        />
        <div className="text-xs text-[#a0a0a0] mt-1.5">
          타임랩스 생성 시 영상이 재생될 속도입니다. 작업 시간이 길수록 높은
          배속을 권장합니다.
        </div>
      </div>

      {/* 출력 품질 설정 */}
      <div className="mb-5">
        <div className="block mb-2.5 text-sm">출력 품질</div>
        <div className="flex gap-2.5" role="radiogroup" aria-label="출력 품질">
          {["low", "medium", "high"].map((quality) => (
            <button
              key={quality}
              className={`py-2 px-4 rounded border-none cursor-pointer transition-colors duration-200 text-sm min-w-20 text-white ${
                timelapseOptions.outputQuality === quality
                  ? "bg-[var(--primary-color)]"
                  : "bg-[var(--bg-accent)]"
              }`}
              onClick={() => onChangeOptions({ outputQuality: quality as any })}
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
            onClick={onSelectFolder}
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
            원본 이미지 보존
          </label>

          <div className="toggle-switch">
            <input
              type="checkbox"
              id="preserveOriginals"
              checked={timelapseOptions.preserveOriginals !== false}
              onChange={(e) =>
                onChangeOptions({
                  preserveOriginals: e.target.checked,
                })
              }
              className="hidden"
            />
            <label
              htmlFor="preserveOriginals"
              className="flex items-center cursor-pointer w-12 h-6 rounded-full relative bg-[var(--bg-accent)] transition-colors duration-300"
            >
              <span
                className={`toggle-dot absolute transition-transform duration-300 left-1 top-1 bg-white w-4 h-4 rounded-full ${
                  timelapseOptions.preserveOriginals !== false
                    ? "translate-x-6"
                    : ""
                }`}
              ></span>
            </label>
          </div>
        </div>
        <div className="text-xs text-[#a0a0a0] mt-1.5">
          타임랩스 생성 후 원본 캡처 이미지를 보존할지 여부를 설정합니다.
          보존하면 디스크 공간을 더 많이 사용하지만 필요할 때 다시 타임랩스를
          만들 수 있습니다.
        </div>
      </div>
    </>
  );
};

export default TimelapseSettings;
