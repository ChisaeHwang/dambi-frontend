import React, { useState, useEffect } from "react";
import { useTimelapseGenerationCapture } from "../hooks/useTimelapseGenerationCapture";
import { formatTime } from "../utils/timeUtils";
import WindowSelector from "./common/WindowSelector";
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
    selectedWindowId,
    activeWindows,
    isLoadingWindows,
    changeSelectedWindow,
    refreshActiveWindows,
    error,
    isGeneratingTimelapse,
    timelapseProgress,
    changeTimelapseOptions,
  } = useTimelapseGenerationCapture();

  // 상태 관리
  const [showGeneratePrompt, setShowGeneratePrompt] = useState<boolean>(false);
  const [workTime, setWorkTime] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // 최초 마운트 여부 확인을 위한 ref
  const mountedRef = React.useRef(false);

  // 컴포넌트 마운트 시 창 목록 초기 로드만 수행
  useEffect(() => {
    // 초기 창 목록 로드 - 최초 마운트 시에만 실행
    if (!mountedRef.current) {
      console.log("Timelapse: 최초 마운트 시 창 목록 로딩");
      refreshActiveWindows();
      mountedRef.current = true;
    }
  }, [refreshActiveWindows]);

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

  // 캡처 시작 핸들러
  const handleStartCapture = () => {
    // 타임랩스가 비활성화되었는지 확인
    if (timelapseOptions.enabled === false) {
      alert(
        "타임랩스 기능이 비활성화되어 있습니다. 설정에서 타임랩스를 활성화해주세요."
      );
      return;
    }

    if (isPaused) {
      // 일시 중지 상태에서 다시 시작
      setIsPaused(false);
      setShowGeneratePrompt(false);
      startCapture();
    } else {
      // 새로운 캡처 시작
      startCapture();
    }
  };

  // 캡처 중지 핸들러
  const handleStopCapture = () => {
    stopCapture();
    if (duration > 0) {
      setIsPaused(true);
      setShowGeneratePrompt(true);
    }
  };

  // 캡처 취소 핸들러
  const handleCancelCapture = () => {
    setIsPaused(false);
    setShowGeneratePrompt(false);
    setWorkTime(0);
  };

  // 타임랩스 생성 핸들러
  const handleGenerateTimelapse = async (speedFactor: number) => {
    try {
      // 사용자가 선택한 속도 값으로 옵션 업데이트
      const updatedOptions = {
        ...timelapseOptions,
        speedFactor: speedFactor,
      };

      // 생성 시작
      const path = await generateTimelapse(updatedOptions);

      // 생성 완료 후 상태 초기화
      setShowGeneratePrompt(false);
      setIsPaused(false);
      setWorkTime(0);

      // 성공 메시지
      alert(`타임랩스가 생성되었습니다: ${path}`);
    } catch (error: any) {
      alert(
        `타임랩스 생성 실패: ${error instanceof Error ? error.message : error}`
      );
    }
  };

  // 창 선택 핸들러
  const handleWindowChange = (windowId: string) => {
    try {
      if (!windowId) return;
      changeSelectedWindow(windowId);
    } catch (error) {
      console.error("Timelapse: 창 선택 변경 중 오류 발생", error);
    }
  };

  // 작업 시간 포맷팅 (00:00:00 형식)
  const formattedTime = formatTime(workTime);

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-normal)] h-screen w-full flex flex-col p-3">
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md p-5 mx-auto w-[98%] max-w-[1400px] min-w-auto h-[calc(100vh-30px)] overflow-y-auto">
        <h2 className="text-white text-xl mb-4 text-center font-semibold">
          워크스페이스
        </h2>

        {error && (
          <div className="text-[var(--text-danger)] bg-[rgba(237,66,69,0.1)] p-2.5 rounded mb-4 text-center">
            {error}
          </div>
        )}

        {!isCapturing && !isPaused && (
          <div className="mb-4">
            <WindowSelector
              activeWindows={activeWindows}
              selectedWindowId={selectedWindowId}
              onWindowChange={handleWindowChange}
              isLoadingWindows={isLoadingWindows}
              onRefreshWindows={refreshActiveWindows}
            />
          </div>
        )}

        <TimelapseTimer formattedTime={formattedTime} />

        {!showGeneratePrompt && (
          <TimelapseControls
            isCapturing={isCapturing}
            onStart={handleStartCapture}
            onStop={handleStopCapture}
            isPaused={isPaused}
          />
        )}

        {showGeneratePrompt && (
          <GeneratePrompt
            onGenerate={handleGenerateTimelapse}
            onCancel={handleCancelCapture}
            onResumeCapture={handleStartCapture}
            isGenerating={isGeneratingTimelapse}
            progress={timelapseProgress}
            duration={duration}
            defaultSpeedFactor={timelapseOptions.speedFactor}
            timelapseEnabled={timelapseOptions.enabled !== false}
          />
        )}
      </div>
    </div>
  );
};

export default Timelapse;
