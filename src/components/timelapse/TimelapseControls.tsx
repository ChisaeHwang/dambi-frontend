import React from "react";

export interface TimelapseControlsProps {
  isCapturing: boolean;
  isPaused: boolean;
  onStart: () => void;
  onStop: () => void;
}

const TimelapseControls: React.FC<TimelapseControlsProps> = ({
  isCapturing,
  isPaused,
  onStart,
  onStop,
}) => {
  return (
    <div className="flex justify-center gap-4 mt-5 mb-8">
      {!isCapturing ? (
        <button
          onClick={onStart}
          className="py-3 px-6 rounded border-none bg-[var(--status-green)] text-white cursor-pointer text-base font-semibold flex items-center justify-center gap-2 min-w-40 shadow-md hover:bg-[#2a9d5a] transition-colors duration-200"
        >
          <span className="text-lg">{isPaused ? "▶" : "⏺"}</span>
          {isPaused ? "녹화 계속하기" : "녹화 시작"}
        </button>
      ) : (
        <button
          onClick={onStop}
          className="py-3 px-6 rounded border-none bg-[var(--text-danger)] text-white cursor-pointer text-base font-semibold flex items-center justify-center gap-2 min-w-40 shadow-md hover:bg-[#c93b3b] transition-colors duration-200"
        >
          <span className="text-lg">⏹</span> 녹화 중지
        </button>
      )}
    </div>
  );
};

export default TimelapseControls;
