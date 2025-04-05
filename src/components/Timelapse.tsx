import React, { useState, useEffect } from "react";
import {
  useTimelapseGenerationCapture,
  BlurRegion,
} from "../hooks/useTimelapseGenerationCapture";
import { formatTime } from "../utils/timeUtils";
import WindowSelector from "./common/WindowSelector";
import TimelapseTimer from "./timelapse/TimelapseTimer";
import TimelapseControls from "./timelapse/TimelapseControls";
import GeneratePrompt from "./timelapse/GeneratePrompt";
import BlurRegionSelector from "./timelapse/BlurRegionSelector";

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

  // 블러 영역 관리
  const [blurRegions, setBlurRegions] = useState<BlurRegion[]>(
    timelapseOptions.blurRegions || []
  );
  const [showBlurSelector, setShowBlurSelector] = useState<boolean>(false);

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

  // 블러 영역이 변경될 때 타임랩스 옵션 업데이트
  useEffect(() => {
    // 현재 options.blurRegions와 상태의 blurRegions가 다를 때만 업데이트
    const currentBlurRegions = timelapseOptions.blurRegions || [];
    const isChanged =
      JSON.stringify(currentBlurRegions) !== JSON.stringify(blurRegions);

    if (blurRegions.length > 0 && isChanged) {
      changeTimelapseOptions({
        ...timelapseOptions,
        blurRegions: [...blurRegions],
      });
    }
  }, [blurRegions, timelapseOptions, changeTimelapseOptions]);

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

    // 블러 선택기 닫기
    setShowBlurSelector(false);
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
      // 사용자가 선택한 속도 값과 블러 영역으로 옵션 업데이트
      const updatedOptions = {
        ...timelapseOptions,
        speedFactor,
        blurRegions: [...blurRegions],
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

  // 블러 영역 변경 핸들러
  const handleBlurRegionsChange = (regions: BlurRegion[]) => {
    setBlurRegions(regions);
  };

  // 블러 선택기 토글
  const toggleBlurSelector = () => {
    setShowBlurSelector(!showBlurSelector);
  };

  // 작업 시간 포맷팅 (00:00:00 형식)
  const formattedTime = formatTime(workTime);

  // 현재 선택된 창의 썸네일 URL 찾기
  const selectedWindow = activeWindows.find(
    (window) => window.id === selectedWindowId
  );
  const thumbnailUrl = selectedWindow?.thumbnailDataUrl || "";
  const thumbnailWidth = selectedWindow?.thumbnailWidth || 320;
  const thumbnailHeight = selectedWindow?.thumbnailHeight || 240;

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

            {selectedWindowId && (
              <div className="mt-4 text-center">
                <button
                  onClick={toggleBlurSelector}
                  className="py-2 px-4 bg-[var(--bg-accent)] text-[var(--text-normal)] rounded hover:bg-[var(--bg-hover)] transition-colors duration-200"
                >
                  {showBlurSelector
                    ? "블러 영역 설정 닫기"
                    : "블러 영역 설정하기"}
                </button>

                {showBlurSelector && (
                  <div className="mt-4 p-6 bg-[var(--bg-primary)] rounded-lg mx-auto max-w-[90%]">
                    <h3 className="text-xl font-semibold mb-3 text-[var(--primary-color)]">
                      블러 처리할 영역 선택
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mb-5">
                      블러 처리할 영역을 드래그하여 설정하세요. 타임랩스 생성 시
                      선택한 영역은 블러 처리됩니다.
                    </p>

                    <div className="bg-[var(--bg-secondary)] p-4 rounded-md shadow-inner">
                      <BlurRegionSelector
                        thumbnailUrl={thumbnailUrl}
                        thumbnailWidth={thumbnailWidth}
                        thumbnailHeight={thumbnailHeight}
                        regions={blurRegions}
                        onRegionsChange={handleBlurRegionsChange}
                        isEditable={!isCapturing}
                      />
                    </div>

                    <div className="mt-5 flex justify-end space-x-3">
                      <button
                        onClick={toggleBlurSelector}
                        className="py-2 px-5 bg-[var(--primary-color)] text-white rounded hover:bg-[var(--primary-color-hover)] transition-colors duration-200 font-medium"
                      >
                        완료
                      </button>
                      <button
                        onClick={() => {
                          setBlurRegions([]);
                          console.log("블러 영역 모두 삭제");
                        }}
                        className="py-2 px-5 bg-[var(--bg-secondary)] text-[var(--text-normal)] rounded hover:bg-[var(--bg-hover)] transition-colors duration-200"
                      >
                        모두 삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
