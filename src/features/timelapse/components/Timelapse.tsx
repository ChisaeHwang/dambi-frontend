import React, { useState, useEffect } from "react";
import { useTimelapseGenerationCapture } from "../hooks/useTimelapseGenerationCapture";
import { formatTime } from "../../../utils/timeUtils";
import WindowSelector from "../../../components/common/WindowSelector";
import TimelapseTimer from "./TimelapseTimer";
import TimelapseControls from "./TimelapseControls";
import GeneratePrompt from "./GeneratePrompt";
import BlurRegionSelector from "./BlurRegionSelector";
import { BlurRegion } from "../types";

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
  const [blurRegions, setBlurRegions] = useState<BlurRegion[]>(() => {
    // 저장된 블러 영역이 있으면 깊은 복사로 가져옵니다
    const savedRegions = timelapseOptions.blurRegions || [];
    return JSON.parse(JSON.stringify(savedRegions));
  });
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

    // 블러 선택기 닫기 (블러 영역은 변경하지 않고 유지)
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
      // 현재 선택된 창의 썸네일 정보
      const selectedWindow = activeWindows.find(
        (window) => window.id === selectedWindowId
      );

      // 사용자가 선택한 속도 값과 블러 영역으로 옵션 업데이트
      const updatedOptions = {
        ...timelapseOptions,
        speedFactor,
        blurRegions: [...blurRegions],
        // 썸네일 해상도 명시적으로 전달
        thumbnailWidth: selectedWindow?.thumbnailWidth || 320,
        thumbnailHeight: selectedWindow?.thumbnailHeight || 240,
      };

      console.log("타임랩스 생성 옵션:", updatedOptions);

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
    // 변경된 블러 영역 상태 업데이트
    setBlurRegions(regions);
    // 변경된 블러 영역을 전역 옵션에도 즉시 저장
    changeTimelapseOptions({
      ...timelapseOptions,
      blurRegions: [...regions],
    });
    console.log("블러 영역 변경:", regions.length, "개 영역");
  };

  // 블러 선택기 토글
  const toggleBlurSelector = () => {
    if (showBlurSelector) {
      // 블러 선택기를 닫을 때는 영역을 유지합니다 (변경하지 않음)
      setShowBlurSelector(false);
      console.log(
        "블러 영역 설정 닫기: 현재 영역 유지",
        blurRegions.length,
        "개"
      );
    } else {
      // 블러 선택기를 열 때는 새로운 썸네일을 위해 창 목록을 새로고침합니다
      refreshActiveWindows();
      setShowBlurSelector(true);
      console.log("블러 영역 설정 시작");
    }
  };

  // 모든 블러 영역 삭제
  const handleClearAllBlurRegions = () => {
    if (blurRegions.length > 0) {
      if (
        window.confirm(
          "모든 블러 영역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        )
      ) {
        setBlurRegions([]);
        // 전역 옵션에서도 블러 영역 삭제
        changeTimelapseOptions({
          ...timelapseOptions,
          blurRegions: [],
        });
        console.log("모든 블러 영역 삭제됨");
      }
    } else {
      alert("삭제할 블러 영역이 없습니다.");
    }
  };

  // 작업 시간 표시
  const formattedWorkTime = formatTime(workTime);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col bg-[var(--bg-secondary)] rounded-lg p-6 space-y-6 h-full overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">타임랩스 워크스페이스</h1>

        {/* 창 선택 영역 */}
        <div className="grid gap-4">
          <div className="flex flex-col">
            <label className="text-lg font-medium mb-2">캡처할 창 선택</label>

            <div className="flex-1">
              <WindowSelector
                selectedWindowId={selectedWindowId}
                activeWindows={activeWindows}
                isLoading={isLoadingWindows}
                onSelect={handleWindowChange}
                onRefresh={refreshActiveWindows}
                disabled={isCapturing || isPaused || showBlurSelector}
                renderButtons={() => (
                  <button
                    onClick={toggleBlurSelector}
                    className={`py-2 px-4 rounded min-w-[120px] text-sm text-white ${
                      showBlurSelector
                        ? "bg-indigo-600 hover:bg-indigo-700"
                        : "bg-[var(--bg-accent)] hover:bg-gray-700"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={isCapturing || !selectedWindowId}
                    title={
                      showBlurSelector
                        ? "블러 영역 설정 완료"
                        : "캡처 영상에서 제외할 영역 설정"
                    }
                  >
                    {showBlurSelector ? "영역 설정 완료" : "블러 영역 설정"}
                  </button>
                )}
              />
            </div>

            {/* 안내 메시지 */}
            {error && <div className="mt-2 text-red-500 text-sm">{error}</div>}
            {blurRegions.length > 0 && (
              <div className="mt-2 text-green-500 text-sm">
                {blurRegions.length}개의 블러 영역이 설정되었습니다.
              </div>
            )}
          </div>
        </div>

        {/* 블러 영역 선택기 (show/hide 토글) */}
        {showBlurSelector && selectedWindowId && (
          <BlurRegionSelector
            windowId={selectedWindowId}
            activeWindows={activeWindows}
            initialRegions={blurRegions}
            onRegionsChange={handleBlurRegionsChange}
          />
        )}

        {/* 타이머 및 제어 영역 */}
        {!showBlurSelector && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-8">
            {/* 타이머 및 상태 표시 */}
            <TimelapseTimer
              isCapturing={isCapturing}
              duration={formattedWorkTime}
              isPaused={isPaused}
            />

            {/* 제어 버튼 */}
            <TimelapseControls
              isCapturing={isCapturing}
              isPaused={isPaused}
              onStart={handleStartCapture}
              onStop={handleStopCapture}
              onCancel={handleCancelCapture}
              disabled={!selectedWindowId || showBlurSelector}
            />
          </div>
        )}
      </div>

      {/* 타임랩스 생성 프롬프트 (모달) */}
      {showGeneratePrompt && (
        <GeneratePrompt
          onGenerate={handleGenerateTimelapse}
          onCancel={handleCancelCapture}
          isGenerating={isGeneratingTimelapse}
          progress={timelapseProgress}
          captureTime={workTime}
        />
      )}
    </div>
  );
};

export default Timelapse;
