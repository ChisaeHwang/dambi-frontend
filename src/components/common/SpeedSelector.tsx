import React from "react";

interface SpeedSelectorProps {
  selectedSpeed: number;
  speedOptions: number[];
  onSpeedChange: (speed: number) => void;
}

const SpeedSelector: React.FC<SpeedSelectorProps> = ({
  selectedSpeed,
  speedOptions,
  onSpeedChange,
}) => {
  // 각 배속에 대한 설명 추가
  const speedDescriptions: Record<number, string> = {
    3: "짧은 작업에 적합 (1시간 → 20분)",
    6: "중간 길이 작업에 추천 (1시간 → 10분)",
    9: "긴 작업에 효율적 (1시간 → 7분)",
    20: "매우 긴 작업에 최적화 (1시간 → 3분)",
  };

  return (
    <div className="mb-6">
      <h3 className="text-white text-base mb-2">타임랩스 배속</h3>
      <div className="flex flex-col gap-3">
        {speedOptions.map((speed) => (
          <div key={speed} className="flex flex-col gap-1">
            <button
              onClick={() => onSpeedChange(speed)}
              className={`p-2.5 px-4 rounded border-none ${
                selectedSpeed === speed
                  ? "bg-[var(--primary-color)]"
                  : "bg-[var(--bg-accent)]"
              } text-white cursor-pointer transition-colors duration-200 text-sm ${
                selectedSpeed === speed ? "font-semibold" : "font-normal"
              } min-w-60 text-left flex items-center justify-between`}
            >
              <span className="flex items-center">
                <span
                  className={`${
                    selectedSpeed === speed
                      ? "bg-[#ffffff30]"
                      : "bg-[#ffffff15]"
                  } rounded px-2.5 py-1 mr-2.5 text-xs font-bold`}
                >
                  {speed}x
                </span>
                {speedDescriptions[speed]}
              </span>
              {selectedSpeed === speed && (
                <span className="text-base ml-2">✓</span>
              )}
            </button>
          </div>
        ))}
      </div>
      <div className="text-xs text-[#a0a0a0] mt-2">
        높은 배속일수록 더 짧은 영상이 생성되지만, 작업 과정의 세부 내용이
        생략될 수 있습니다.
      </div>
    </div>
  );
};

export default SpeedSelector;
