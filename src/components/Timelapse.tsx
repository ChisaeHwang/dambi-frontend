import React, { useState, useEffect } from "react";

// 일렉트론 환경에서 IPC 통신을 위한 타입 정의
declare global {
  interface Window {
    electron: {
      startCapture: (interval: number) => void;
      stopCapture: () => void;
      generateTimelapse: (options: TimelapseOptions) => Promise<string>;
      onCaptureStatus: (callback: (status: CaptureStatus) => void) => void;
      isMaximized: () => Promise<boolean>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
    };
  }
}

interface TimelapseOptions {
  fps: number;
  outputQuality: "low" | "medium" | "high";
  outputFormat: "mp4" | "gif";
}

interface CaptureStatus {
  isCapturing: boolean;
  frameCount: number;
  duration: number;
}

const Timelapse: React.FC = () => {
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

  useEffect(() => {
    // 일렉트론 환경 확인 및 디버깅
    console.log("Window 객체:", window);
    console.log("Electron 객체 존재 여부:", !!window.electron);

    if (window.electron) {
      console.log("Electron 환경이 감지되었습니다.");
      setElectronAvailable(true);

      window.electron.onCaptureStatus((status) => {
        console.log("캡처 상태 업데이트:", status);
        setIsCapturing(status.isCapturing);
        setFrameCount(status.frameCount);
        setDuration(status.duration);
      });
    } else {
      console.warn(
        "Electron 환경이 감지되지 않았습니다! 일부 기능이 작동하지 않을 수 있습니다."
      );
    }
  }, []);

  const handleStartCapture = () => {
    console.log("캡처 시작 버튼 클릭");

    if (window.electron) {
      console.log(
        `Electron API를 사용하여 캡처 시작: 간격 ${captureInterval}초`
      );
      window.electron.startCapture(captureInterval);
      setIsCapturing(true);
    } else {
      // 일렉트론 환경이 아닐 때 모의 동작
      console.log("모의 환경: 캡처 시작");
      setIsCapturing(true);
    }
  };

  const handleStopCapture = () => {
    console.log("캡처 중지 버튼 클릭");

    if (window.electron) {
      console.log("Electron API를 사용하여 캡처 중지");
      window.electron.stopCapture();
      setIsCapturing(false);
    } else {
      // 일렉트론 환경이 아닐 때 모의 동작
      console.log("모의 환경: 캡처 중지");
      setIsCapturing(false);
    }
  };

  const handleGenerateTimelapse = async () => {
    console.log("타임랩스 생성 버튼 클릭", timelapseOptions);

    if (window.electron) {
      try {
        console.log(
          "Electron API를 사용하여 타임랩스 생성 요청:",
          timelapseOptions
        );

        // 타임랩스 생성 시 프레임 속도 조정
        const adjustedOptions = {
          ...timelapseOptions,
          fps: Math.min(timelapseOptions.fps * 2, 60), // FPS를 두 배로 조정 (최대 60)
        };

        const path = await window.electron.generateTimelapse(adjustedOptions);
        console.log("타임랩스 생성 완료:", path);
        setOutputPath(path);
        alert(`타임랩스가 생성되었습니다: ${path}`);
      } catch (error: any) {
        console.error("타임랩스 생성 오류:", error);
        alert(
          `타임랩스 생성 실패: ${
            error instanceof Error ? error.message : error
          }`
        );
      }
    } else {
      // 일렉트론 환경이 아닐 때 모의 동작
      console.log("모의 환경: 타임랩스 생성");
      setOutputPath("/mock/path/timelapse.mp4");
    }
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
      <h2 className="section-title">작업 타임랩스</h2>

      {/* 타임랩스 제어 섹션 */}
      <div className="card">
        <h3 className="section-title">타임랩스 캡처</h3>

        <div className="form-group">
          <label className="form-label">캡처 간격 (초)</label>
          <input
            type="number"
            min="1"
            max="60"
            value={captureInterval}
            onChange={(e) => setCaptureInterval(parseInt(e.target.value))}
            disabled={isCapturing}
            className="form-input"
          />
        </div>

        <div className="text-center mt-4">
          {!isCapturing ? (
            <button onClick={handleStartCapture} className="custom-button">
              캡처 시작
            </button>
          ) : (
            <button
              onClick={handleStopCapture}
              className="custom-button danger"
            >
              캡처 중지
            </button>
          )}
        </div>

        {isCapturing && (
          <div className="status-box active animate-pulse">
            <div className="status-item">
              <span className="status-label">상태:</span>
              <span className="status-value highlight">캡처 중</span>
            </div>
            <div className="status-item">
              <span className="status-label">캡처된 프레임:</span>
              <span className="status-value">{frameCount}장</span>
            </div>
            <div className="status-item">
              <span className="status-label">경과 시간:</span>
              <span className="status-value">{formatTime(duration)}</span>
            </div>
          </div>
        )}
      </div>

      {/* 타임랩스 생성 섹션 */}
      {frameCount > 0 && !isCapturing && (
        <div className="card">
          <h3 className="section-title">타임랩스 생성</h3>

          <div className="flex flex-wrap gap-4 mb-5">
            <label className="form-group">
              <span className="form-label">FPS:</span>
              <select
                value={timelapseOptions.fps}
                onChange={(e) =>
                  setTimelapseOptions({
                    ...timelapseOptions,
                    fps: parseInt(e.target.value),
                  })
                }
                className="form-input"
              >
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="60">60</option>
              </select>
            </label>

            <label className="form-group">
              <span className="form-label">화질:</span>
              <select
                value={timelapseOptions.outputQuality}
                onChange={(e) =>
                  setTimelapseOptions({
                    ...timelapseOptions,
                    outputQuality: e.target.value as "low" | "medium" | "high",
                  })
                }
                className="form-input"
              >
                <option value="low">낮음</option>
                <option value="medium">중간</option>
                <option value="high">높음</option>
              </select>
            </label>

            <label className="form-group">
              <span className="form-label">출력 형식:</span>
              <select
                value={timelapseOptions.outputFormat}
                onChange={(e) =>
                  setTimelapseOptions({
                    ...timelapseOptions,
                    outputFormat: e.target.value as "mp4" | "gif",
                  })
                }
                className="form-input"
              >
                <option value="mp4">MP4 비디오</option>
                <option value="gif">GIF 애니메이션</option>
              </select>
            </label>
          </div>

          <div className="text-center">
            <button onClick={handleGenerateTimelapse} className="custom-button">
              타임랩스 생성
            </button>
          </div>
        </div>
      )}

      {/* 생성된 타임랩스 결과 섹션 */}
      {outputPath && (
        <div className="card">
          <h3 className="section-title">생성된 타임랩스</h3>
          <p className="mb-4 text-gray-600 break-all">
            파일 위치: {outputPath}
          </p>
          {timelapseOptions.outputFormat === "mp4" && (
            <video
              controls
              src={`file://${outputPath}`}
              className="w-full rounded-md shadow-md"
            />
          )}
          {timelapseOptions.outputFormat === "gif" && (
            <img
              src={`file://${outputPath}`}
              className="w-full rounded-md shadow-md"
              alt="Generated timelapse"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Timelapse;
