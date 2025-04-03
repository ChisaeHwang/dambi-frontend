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
        return "#5865f2";
      case "complete":
        return "#43b581";
      case "error":
        return "#ed4245";
      default:
        return "#4f545c";
    }
  };

  return (
    <div
      style={{
        marginTop: "16px",
        marginBottom: "16px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontSize: "14px",
            color: "#dcddde",
          }}
        >
          {stage}
        </span>
        <span
          style={{
            fontSize: "14px",
            color: "#dcddde",
          }}
        >
          {percentage}%
        </span>
      </div>
      <div
        style={{
          height: "8px",
          width: "100%",
          backgroundColor: "#40444b",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percentage}%`,
            backgroundColor: getProgressColor(),
            borderRadius: "4px",
            transition: "width 0.3s ease-in-out",
          }}
        />
      </div>

      {status === "error" && progress.error && (
        <div
          style={{
            marginTop: "8px",
            color: "#ed4245",
            fontSize: "14px",
          }}
        >
          {progress.error}
        </div>
      )}
    </div>
  );
};

export default TimelapseProgressBar;
