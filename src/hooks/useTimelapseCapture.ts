import { useState, useEffect } from "react";
import {
  startCaptureSession,
  stopCaptureSession,
  getCaptureSessionStatus,
  SpeedFactorPreset,
  setTimelapseSpeed,
} from "../utils/captureUtils";

interface CaptureStatus {
  frameCount: number;
  duration: number;
  estimatedPlaybackDuration: number;
}

export const useTimelapseCapture = () => {
  // 상태 관리
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [interval, setInterval] = useState<number>(5);
  const [speedFactor, setSpeedFactor] = useState<number>(
    SpeedFactorPreset.NORMAL
  );
  const [status, setStatus] = useState<CaptureStatus>({
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
  const startCapture = async () => {
    try {
      setTimelapseSpeed(speedFactor);
      await startCaptureSession(interval, speedFactor);
      setIsCapturing(true);
    } catch (error) {
      console.error("캡처 시작 오류:", error);
      throw error;
    }
  };

  // 캡처 중지
  const stopCapture = async () => {
    try {
      const result = await stopCaptureSession();
      setIsCapturing(false);
      return result;
    } catch (error) {
      console.error("캡처 중지 오류:", error);
      throw error;
    }
  };

  // 속도 변경 핸들러
  const changeSpeed = (newSpeed: number) => {
    setSpeedFactor(newSpeed);
  };

  // 간격 변경 핸들러
  const changeInterval = (newInterval: number) => {
    setInterval(newInterval > 0 ? newInterval : 1);
  };

  return {
    isCapturing,
    interval,
    speedFactor,
    status,
    startCapture,
    stopCapture,
    changeSpeed,
    changeInterval,
  };
};
