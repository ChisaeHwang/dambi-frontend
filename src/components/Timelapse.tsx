import React, { useState, useEffect } from "react";
import { useTimelapseGenerationCapture } from "../hooks/useTimelapseGenerationCapture";
import { formatTime } from "../utils/timeUtils";

// 일렉트론 환경에서 IPC 통신을 위한 타입 정의
declare global {
  interface Window {
    electron: {
      startCapture: (interval: number, screen?: string) => void;
      stopCapture: () => void;
      generateTimelapse: (options: any) => Promise<string>;
      onCaptureStatus: (callback: (status: any) => void) => void;
      isMaximized: () => Promise<boolean>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
    };
  }
}

const Timelapse: React.FC = () => {
  const {
    isCapturing,
    frameCount,
    startCapture,
    stopCapture,
    generateTimelapse,
  } = useTimelapseGenerationCapture();

  const [showGeneratePrompt, setShowGeneratePrompt] = useState<boolean>(false);
  const [workTime, setWorkTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  // 타이머 관리
  useEffect(() => {
    if (isCapturing && !timerInterval) {
      const interval = setInterval(() => {
        setWorkTime((prev) => prev + 1);
      }, 1000);
      setTimerInterval(interval);
    } else if (!isCapturing && timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }

    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isCapturing, timerInterval]);

  // 캡처 중지 핸들러
  const handleStopCapture = () => {
    stopCapture();
    if (frameCount > 0) {
      setShowGeneratePrompt(true);
    }
  };

  // 타임랩스 생성 핸들러
  const handleGenerateTimelapse = async () => {
    try {
      const path = await generateTimelapse();
      alert(`타임랩스가 생성되었습니다: ${path}`);
      setShowGeneratePrompt(false);
    } catch (error: any) {
      alert(
        `타임랩스 생성 실패: ${error instanceof Error ? error.message : error}`
      );
    }
  };

  // 작업 시간 포맷팅 (00:00:00 형식)
  const formattedTime = formatTime(workTime);

  return (
    <div className="workspace-container">
      <div className="card">
        <h2 className="section-title">워크스페이스</h2>

        <div className="timer-display">
          <div className="time-counter">{formattedTime}</div>
        </div>

        <div className="action-buttons">
          <button
            onClick={isCapturing ? handleStopCapture : startCapture}
            className="custom-button primary"
          >
            {isCapturing ? "정지" : "시작"}
          </button>
        </div>

        {/* 타임랩스 생성 프롬프트 */}
        {showGeneratePrompt && (
          <div className="generate-prompt">
            <p>타임랩스를 만드시겠습니까?</p>
            <div className="prompt-buttons">
              <button
                onClick={handleGenerateTimelapse}
                className="custom-button confirm"
              >
                예
              </button>
              <button
                onClick={() => setShowGeneratePrompt(false)}
                className="custom-button cancel"
              >
                아니오
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Timelapse;
