import React from "react";
import { SpeedFactorPreset } from "../../utils/captureUtils";

interface CaptureControlsProps {
  isCapturing: boolean;
  interval: number;
  speedFactor: number;
  onIntervalChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
  onStartCapture: () => void;
  onStopCapture: () => void;
}

const CaptureControls: React.FC<CaptureControlsProps> = ({
  isCapturing,
  interval,
  speedFactor,
  onIntervalChange,
  onSpeedChange,
  onStartCapture,
  onStopCapture,
}) => {
  const handleIntervalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newInterval = parseInt(event.target.value, 10);
    onIntervalChange(newInterval > 0 ? newInterval : 1);
  };

  const handleSpeedChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpeed = parseInt(event.target.value, 10);
    onSpeedChange(newSpeed);
  };

  return (
    <>
      <div className="form-group">
        <label className="form-label">캡처 간격 (초)</label>
        <input
          type="number"
          min="1"
          max="60"
          value={interval}
          onChange={handleIntervalChange}
          disabled={isCapturing}
          className="form-input"
        />
      </div>

      <div className="form-group" style={{ marginTop: "16px" }}>
        <label className="form-label">재생 속도</label>
        <select
          value={speedFactor}
          onChange={handleSpeedChange}
          disabled={isCapturing}
          className="form-input"
        >
          <option value={SpeedFactorPreset.NORMAL}>1배속 (기본)</option>
          <option value={SpeedFactorPreset.FAST}>3배속</option>
          <option value={SpeedFactorPreset.FASTER}>5배속</option>
          <option value={SpeedFactorPreset.FASTEST}>10배속</option>
        </select>
      </div>

      <div style={{ marginTop: "24px" }}>
        {!isCapturing ? (
          <button onClick={onStartCapture} className="custom-button">
            캡처 시작
          </button>
        ) : (
          <button onClick={onStopCapture} className="custom-button danger">
            캡처 중지
          </button>
        )}
      </div>
    </>
  );
};

export default CaptureControls;
