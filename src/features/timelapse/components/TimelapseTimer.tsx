import React from "react";

interface TimelapseTimerProps {
  isCapturing: boolean;
  duration: string;
  isPaused: boolean;
}

const TimelapseTimer: React.FC<TimelapseTimerProps> = ({
  isCapturing,
  duration,
  isPaused,
}) => {
  return (
    <div className="flex flex-col items-center justify-center bg-[var(--bg-tertiary)] p-6 rounded-lg shadow-sm h-full">
      <div className="text-sm mb-3 font-medium text-[var(--text-muted)]">
        {isCapturing ? "녹화 진행 중..." : isPaused ? "일시 중지됨" : "대기 중"}
      </div>
      <div className="relative inline-flex items-center">
        <div className="text-5xl font-digital tracking-wide font-semibold text-shadow-glow">
          {duration}
        </div>
        {isCapturing && (
          <div className="ml-3 h-3 w-3 bg-red-600 rounded-full animate-pulse"></div>
        )}
      </div>
    </div>
  );
};

export default TimelapseTimer;
