import React, { useState, useEffect } from "react";
import {
  startCaptureSession,
  stopCaptureSession,
  getCaptureSessionStatus,
  SpeedFactorPreset,
  setTimelapseSpeed,
} from "../utils/captureUtils";

const TimelapseControls: React.FC = () => {
  // 상태 관리
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [interval, setInterval] = useState<number>(5);
  const [speedFactor, setSpeedFactor] = useState<number>(
    SpeedFactorPreset.NORMAL
  );
  const [status, setStatus] = useState({
    frameCount: 0,
    duration: 0,
    estimatedPlaybackDuration: 0,
  });

  // 주기적으로 상태 업데이트
  useEffect(() => {
    if (!isCapturing) return;

    const intervalId = window.setInterval(() => {
      const currentStatus = getCaptureSessionStatus();
      setStatus({
        frameCount: currentStatus.frameCount,
        duration: currentStatus.duration,
        estimatedPlaybackDuration: currentStatus.estimatedPlaybackDuration || 0,
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isCapturing]);

  // 캡처 시작
  const handleStartCapture = async () => {
    try {
      setTimelapseSpeed(speedFactor);
      await startCaptureSession(interval, speedFactor);
      setIsCapturing(true);
    } catch (error) {
      console.error("캡처 시작 오류:", error);
      alert("캡처를 시작하지 못했습니다: " + error);
    }
  };

  // 캡처 중지
  const handleStopCapture = async () => {
    try {
      const result = await stopCaptureSession();
      setIsCapturing(false);

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

  // 속도 변경 핸들러
  const handleSpeedChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpeed = parseInt(event.target.value, 10);
    setSpeedFactor(newSpeed);
  };

  // 간격 변경 핸들러
  const handleIntervalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newInterval = parseInt(event.target.value, 10);
    setInterval(newInterval > 0 ? newInterval : 1);
  };

  // 시간 포맷 함수 (초 -> MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="card">
      <h2 className="section-title">타임랩스 제어</h2>

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
          <button onClick={handleStartCapture} className="custom-button">
            캡처 시작
          </button>
        ) : (
          <button onClick={handleStopCapture} className="custom-button danger">
            캡처 중지
          </button>
        )}
      </div>

      {isCapturing && (
        <div
          style={{
            marginTop: "20px",
            padding: "16px",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--bg-primary)",
            border: "1px solid var(--status-green)",
          }}
        >
          <div
            style={{
              marginBottom: "8px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: "var(--text-positive)", fontWeight: "bold" }}>
              캡처 상태:
            </span>
            <span>진행 중</span>
          </div>
          <div
            style={{
              marginBottom: "8px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: "var(--text-normal)", fontWeight: "500" }}>
              캡처 프레임:
            </span>
            <span>{status.frameCount}개</span>
          </div>
          <div
            style={{
              marginBottom: "8px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: "var(--text-normal)", fontWeight: "500" }}>
              경과 시간:
            </span>
            <span>{formatTime(status.duration)}</span>
          </div>
          <div
            style={{
              marginBottom: "8px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ color: "var(--text-normal)", fontWeight: "500" }}>
              재생 시간 (예상):
            </span>
            <span>{formatTime(status.estimatedPlaybackDuration)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-normal)", fontWeight: "500" }}>
              타임랩스 속도:
            </span>
            <span>{speedFactor}배속</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelapseControls;
