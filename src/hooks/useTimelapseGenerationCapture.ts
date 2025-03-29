import { useState, useEffect } from "react";

// 타임랩스 옵션 인터페이스
export interface TimelapseOptions {
  fps: number;
  outputQuality: "low" | "medium" | "high";
  outputFormat: "mp4" | "gif";
}

// 캡처 상태 인터페이스
export interface CaptureStatus {
  isCapturing: boolean;
  frameCount: number;
  duration: number;
}

// 일렉트론 환경 확인
const isElectronEnv = () => {
  return (
    typeof window !== "undefined" && typeof window.electron !== "undefined"
  );
};

export const useTimelapseGenerationCapture = () => {
  // 상태 관리
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [captureInterval, setCaptureInterval] = useState<number>(5);
  const [frameCount, setFrameCount] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [timelapseOptions, setTimelapseOptions] = useState<TimelapseOptions>({
    fps: 30,
    outputQuality: "medium",
    outputFormat: "mp4",
  });
  const [outputPath, setOutputPath] = useState<string>("");
  const [electronAvailable, setElectronAvailable] = useState<boolean>(false);

  // 컴포넌트 초기화 시 Electron 환경 확인
  useEffect(() => {
    const electronEnv = isElectronEnv();
    setElectronAvailable(electronEnv);

    if (electronEnv) {
      // 캡처 상태 이벤트 리스너 등록
      window.electron.onCaptureStatus((status) => {
        setIsCapturing(status.isCapturing);
        setFrameCount(status.frameCount);
        setDuration(status.duration);
      });
    }
  }, []);

  // 캡처 간격 변경 핸들러
  const changeCaptureInterval = (interval: number) => {
    setCaptureInterval(interval);
  };

  // 타임랩스 옵션 변경 핸들러
  const changeTimelapseOptions = (options: Partial<TimelapseOptions>) => {
    setTimelapseOptions((prev) => ({
      ...prev,
      ...options,
    }));
  };

  // 캡처 시작
  const startCapture = () => {
    if (electronAvailable) {
      window.electron.startCapture(captureInterval);
      setIsCapturing(true);
    } else {
      console.log("모의 환경: 캡처 시작");
      setIsCapturing(true);
    }
  };

  // 캡처 중지
  const stopCapture = () => {
    if (electronAvailable) {
      window.electron.stopCapture();
      setIsCapturing(false);
    } else {
      console.log("모의 환경: 캡처 중지");
      setIsCapturing(false);
    }
  };

  // 타임랩스 생성
  const generateTimelapse = async () => {
    try {
      if (electronAvailable) {
        // 타임랩스 생성 시 프레임 속도 조정
        const adjustedOptions = {
          ...timelapseOptions,
          fps: Math.min(timelapseOptions.fps * 2, 60), // FPS를 두 배로 조정 (최대 60)
        };

        const path = await window.electron.generateTimelapse(adjustedOptions);
        setOutputPath(path);
        return path;
      } else {
        console.log("모의 환경: 타임랩스 생성");
        const mockPath = "/mock/path/timelapse.mp4";
        setOutputPath(mockPath);
        return mockPath;
      }
    } catch (error) {
      console.error("타임랩스 생성 오류:", error);
      throw error;
    }
  };

  return {
    isCapturing,
    captureInterval,
    frameCount,
    duration,
    timelapseOptions,
    outputPath,
    electronAvailable,
    startCapture,
    stopCapture,
    changeCaptureInterval,
    changeTimelapseOptions,
    generateTimelapse,
  };
};
