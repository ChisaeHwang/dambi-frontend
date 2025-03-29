import React from "react";
import { useTimelapseCapture } from "../hooks/useTimelapseCapture";
import CaptureControls from "./timelapse/CaptureControls";
import CaptureStatus from "./timelapse/CaptureStatus";

const TimelapseControls: React.FC = () => {
  const {
    isCapturing,
    interval,
    speedFactor,
    status,
    startCapture,
    stopCapture,
    changeSpeed,
    changeInterval,
  } = useTimelapseCapture();

  // 캡처 시작
  const handleStartCapture = async () => {
    try {
      await startCapture();
    } catch (error) {
      console.error("캡처 시작 오류:", error);
      alert("캡처를 시작하지 못했습니다: " + error);
    }
  };

  // 캡처 중지
  const handleStopCapture = async () => {
    try {
      const result = await stopCapture();

      if (result) {
        alert(
          `캡처가 완료되었습니다:\n` +
            `총 ${result.frameCount}개 프레임 캡처\n` +
            `저장 위치: ${result.captureDir}`
        );
      }
    } catch (error) {
      console.error("캡처 중지 오류:", error);
      alert("캡처를 중지하지 못했습니다: " + error);
    }
  };

  return (
    <div className="card">
      <h2 className="section-title">타임랩스 제어</h2>

      <CaptureControls
        isCapturing={isCapturing}
        interval={interval}
        speedFactor={speedFactor}
        onIntervalChange={changeInterval}
        onSpeedChange={changeSpeed}
        onStartCapture={handleStartCapture}
        onStopCapture={handleStopCapture}
      />

      {isCapturing && (
        <CaptureStatus
          frameCount={status.frameCount}
          duration={status.duration}
          estimatedPlaybackDuration={status.estimatedPlaybackDuration}
          speedFactor={speedFactor}
        />
      )}
    </div>
  );
};

export default TimelapseControls;
