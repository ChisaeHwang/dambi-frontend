import React from "react";
import { formatTime } from "../../utils/timeUtils";
import CaptureStatus from "./CaptureStatus";

interface CaptureSectionProps {
  isCapturing: boolean;
  captureInterval: number;
  frameCount: number;
  duration: number;
  onCaptureIntervalChange: (interval: number) => void;
  onStartCapture: () => void;
  onStopCapture: () => void;
}

const CaptureSection: React.FC<CaptureSectionProps> = ({
  isCapturing,
  captureInterval,
  frameCount,
  duration,
  onCaptureIntervalChange,
  onStartCapture,
  onStopCapture,
}) => {
  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCaptureIntervalChange(parseInt(e.target.value, 10));
  };

  // 타임랩스 배속 계산 (간격이 작을수록 속도가 빨라짐)
  const speedFactor = Math.round(30 / captureInterval);
  // 재생 시간 예상 계산
  const estimatedPlaybackDuration = Math.round(duration / speedFactor);

  return (
    <div className="card">
      <h2 className="section-title">화면 캡처</h2>

      <div className="form-group">
        <label className="form-label">캡처할 시간 간격</label>
        <input
          type="number"
          min="1"
          max="60"
          value={captureInterval}
          onChange={handleIntervalChange}
          disabled={isCapturing}
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label className="form-label">캡처 간격 (초)</label>
        <input
          type="range"
          min="1"
          max="30"
          value={captureInterval}
          onChange={handleIntervalChange}
          disabled={isCapturing}
          className="form-input"
        />
      </div>

      <div className="text-center">
        <button
          onClick={isCapturing ? onStopCapture : onStartCapture}
          className="custom-button"
        >
          {isCapturing ? "캡처 중지" : "캡처 시작"}
        </button>
      </div>

      {isCapturing && (
        <CaptureStatus
          frameCount={frameCount}
          duration={duration}
          estimatedPlaybackDuration={estimatedPlaybackDuration}
          speedFactor={speedFactor}
        />
      )}
    </div>
  );
};

export default CaptureSection;
