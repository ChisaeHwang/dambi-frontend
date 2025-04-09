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
      <div className="text-sm mb-2 font-medium text-[var(--text-muted)]">
        {isCapturing
          ? "작업 시간 기록 중..."
          : isPaused
            ? "일시 중지됨"
            : "대기 중"}
      </div>
      <div className="text-5xl font-mono tracking-widest font-semibold">
        {duration}
      </div>
    </div>
  );
};

export default TimelapseTimer;
