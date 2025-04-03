import React from "react";
import { TimelapseProgress } from "../../hooks/useTimelapseGenerationCapture";

interface TimelapseProgressBarProps {
  progress: TimelapseProgress;
}

const TimelapseProgressBar: React.FC<TimelapseProgressBarProps> = ({
  progress,
}) => {
  const { status, progress: percentage, stage } = progress;

  // 진행률이 0이면 렌더링하지 않음
  if (status === "start" && percentage === 0) {
    return null;
  }

  // 상태에 따른 스타일 설정
  const getProgressColor = () => {
    switch (status) {
      case "processing":
        return "bg-[var(--primary-color)]";
      case "complete":
        return "bg-[var(--status-green)]";
      case "error":
        return "bg-[var(--text-danger)]";
      default:
        return "bg-[var(--bg-accent)]";
    }
  };

  return (
    <div className="mt-4 mb-4 w-full">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-[var(--text-normal)]">{stage}</span>
        <span className="text-sm text-[var(--text-normal)]">{percentage}%</span>
      </div>
      <div className="h-2 w-full bg-[var(--input-bg)] rounded overflow-hidden">
        <div
          className={`h-full rounded transition-all duration-300 ease-in-out ${getProgressColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {status === "error" && progress.error && (
        <div className="mt-2 text-[var(--text-danger)] text-sm">
          {progress.error}
        </div>
      )}
    </div>
  );
};

export default TimelapseProgressBar;
