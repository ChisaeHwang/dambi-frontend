import React, { useState, useEffect } from "react";
import { useTimelapseGenerationCapture } from "../hooks/useTimelapseGenerationCapture";
import { formatTime } from "../utils/timeUtils";
import WindowSelector from "./common/WindowSelector";
import SpeedSelector from "./common/SpeedSelector";
import TimelapseTimer from "./timelapse/TimelapseTimer";
import TimelapseControls from "./timelapse/TimelapseControls";
import GeneratePrompt from "./timelapse/GeneratePrompt";

const Timelapse: React.FC = () => {
  const {
    isCapturing,
    duration,
    startCapture,
    stopCapture,
    generateTimelapse,
    timelapseOptions,
    changeTimelapseOptions,
    selectedWindowId,
    activeWindows,
    isLoadingWindows,
    changeSelectedWindow,
    refreshActiveWindows,
    error,
  } = useTimelapseGenerationCapture();

  const [showGeneratePrompt, setShowGeneratePrompt] = useState<boolean>(false);
  const [workTime, setWorkTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [selectedSpeedFactor, setSelectedSpeedFactor] = useState<number>(3); // 기본 3배속

  // 컴포넌트 마운트 시 창 목록 초기 로드만 수행
  useEffect(() => {
    // 초기 창 목록 로드
    refreshActiveWindows();
  }, []); // 의존성 배열을 빈 배열로 변경하여 마운트 시에만 실행

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
    if (duration > 0) {
      setShowGeneratePrompt(true);
    }
  };

  // 타임랩스 생성 핸들러
  const handleGenerateTimelapse = async () => {
    try {
      const options = {
        ...timelapseOptions,
        speedFactor: selectedSpeedFactor,
      };
      const path = await generateTimelapse(options);
      alert(`타임랩스가 생성되었습니다: ${path}`);
      setShowGeneratePrompt(false);
    } catch (error: any) {
      alert(
        `타임랩스 생성 실패: ${error instanceof Error ? error.message : error}`
      );
    }
  };

  // 배속 변경 핸들러
  const handleSpeedFactorChange = (speed: number) => {
    setSelectedSpeedFactor(speed);
    changeTimelapseOptions({ speedFactor: speed });
  };

  // 창 선택 핸들러
  const handleWindowChange = (windowId: string) => {
    changeSelectedWindow(windowId);
  };

  // 작업 시간 포맷팅 (00:00:00 형식)
  const formattedTime = formatTime(workTime);

  // 속도 옵션
  const speedOptions = [3, 6, 9, 20];

  return (
    <div
      className="workspace-container"
      style={{
        backgroundColor: "#36393f",
        color: "#dcddde",
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "12px",
        overflow: "hidden", // 전체 컨테이너에서는 스크롤 제거
      }}
    >
      <div
        className="card"
        style={{
          backgroundColor: "#2f3136",
          borderRadius: "8px",
          boxShadow: "0 2px 10px 0 rgba(0,0,0,.2)",
          padding: "20px",
          margin: "0 auto",
          width: "98%",
          maxWidth: "1400px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "auto", // 카드 내부에만 스크롤 허용
        }}
      >
        <h2
          className="section-title"
          style={{
            color: "#fff",
            fontSize: "20px",
            marginBottom: "16px",
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          워크스페이스
        </h2>

        {error && (
          <div
            style={{
              color: "#ed4245",
              backgroundColor: "rgba(237, 66, 69, 0.1)",
              padding: "10px",
              borderRadius: "4px",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {!isCapturing && !showGeneratePrompt && (
          <div className="settings" style={{ marginBottom: "16px" }}>
            <WindowSelector
              activeWindows={activeWindows}
              selectedWindowId={selectedWindowId}
              onWindowChange={handleWindowChange}
              isLoadingWindows={isLoadingWindows}
              onRefreshWindows={refreshActiveWindows}
            />

            <SpeedSelector
              selectedSpeed={selectedSpeedFactor}
              speedOptions={speedOptions}
              onSpeedChange={handleSpeedFactorChange}
            />
          </div>
        )}

        <TimelapseTimer formattedTime={formattedTime} />

        <TimelapseControls
          isCapturing={isCapturing}
          onStart={startCapture}
          onStop={handleStopCapture}
        />

        {showGeneratePrompt && (
          <GeneratePrompt
            onGenerate={handleGenerateTimelapse}
            onCancel={() => setShowGeneratePrompt(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Timelapse;
