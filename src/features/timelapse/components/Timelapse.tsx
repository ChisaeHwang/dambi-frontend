import React, { useState, useEffect } from "react";
import { useTimelapseGenerationCapture } from "../hooks/useTimelapseGenerationCapture";
import { formatTime } from "../../../utils/timeUtils";
import WindowSelector from "../../../components/common/WindowSelector";
import TimelapseTimer from "./TimelapseTimer";
import TimelapseControls from "./TimelapseControls";
import GeneratePrompt from "./GeneratePrompt";
import BlurRegionSelector from "./BlurRegionSelector";
import { BlurRegion } from "../types";
import WorkspaceSessionForm from "./WorkspaceSessionForm";
import { useWorkSession } from "../hooks/useWorkSession";

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
    isStatusInitialized,
  } = useTimelapseGenerationCapture();

  // WorkSession 관련 훅 추가
  const {
    startSession,
    userTaskTypes,
    addTaskType,
    todaySessions,
    stopSession,
  } = useWorkSession();

  // 상태 관리
  const [showGeneratePrompt, setShowGeneratePrompt] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showSessionForm, setShowSessionForm] = useState<boolean>(false);

  // 블러 영역 관리
  const [blurRegions, setBlurRegions] = useState<BlurRegion[]>(() => {
    // 저장된 블러 영역이 있으면 깊은 복사로 가져옵니다
    const savedRegions = timelapseOptions.blurRegions || [];
    return JSON.parse(JSON.stringify(savedRegions));
  });
  const [showBlurSelector, setShowBlurSelector] = useState<boolean>(false);

  // 최초 마운트 여부 확인을 위한 ref
  const mountedRef = React.useRef(false);
  // 이전 캡처 상태 추적을 위한 ref
  const wasCapturingRef = React.useRef(false);

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

  // 페이지 이동 후 돌아왔을 때와 녹화 중지 시 자동으로 타임랩스 생성 모달 표시
  useEffect(() => {
    // 컴포넌트가 마운트될 때, isCapturing 상태 확인
    if (isCapturing) {
      // 이미 녹화 중인 경우 wasCapturingRef를 true로 설정
      wasCapturingRef.current = true;
    } else if (
      wasCapturingRef.current &&
      !isCapturing &&
      duration > 0 &&
      !showGeneratePrompt
    ) {
      // 녹화가 중지되었고, duration이 있으며, 모달이 표시되지 않은 경우
      // isPaused 플래그는 사용하지 않도록 변경
      setShowGeneratePrompt(true);
    }

    // 현재 상태 저장
    wasCapturingRef.current = isCapturing;
  }, [isCapturing, duration, showGeneratePrompt]);

  // 캡처 시작 핸들러 - 작업 세션 폼 모달 표시로 변경
  const handleStartCapture = () => {
    // 타임랩스가 비활성화되었는지 확인
    if (timelapseOptions.enabled === false) {
      alert(
        "타임랩스 기능이 비활성화되어 있습니다. 설정에서 타임랩스를 활성화해주세요."
      );
      return;
    }

    // 작업 세션 모달 표시
    setShowSessionForm(true);
  };

  // 작업 세션 시작 후 캡처 시작
  const handleStartSessionAndCapture = (
    sessionData: Omit<
      import("../../calendar/types").WorkSession,
      "id" | "date" | "duration"
    >
  ) => {
    // 항상 녹화 옵션을 true로 설정 (화면 녹화 포함 체크박스 무시)
    const sessionWithRecording = {
      ...sessionData,
      isRecording: true,
    };

    // 작업 세션 시작
    startSession(sessionWithRecording);

    // 새로운 캡처 시작
    startCapture();

    // 모달 닫기
    setShowSessionForm(false);

    // 블러 선택기 닫기 (블러 영역은 변경하지 않고 유지)
    setShowBlurSelector(false);
  };

  // 캡처 중지 핸들러
  const handleStopCapture = () => {
    // 녹화 중지
    stopCapture();

    // 작업 세션도 함께 종료
    stopSession();
  };

  // 캡처 취소 핸들러
  const handleCancelCapture = () => {
    setShowGeneratePrompt(false);
  };

  // 작업 폼 모달 닫기 핸들러
  const handleCloseSessionForm = () => {
    setShowSessionForm(false);
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

  // 현재 duration 값으로 형식화된 시간 표시
  const formattedDuration = formatTime(duration / 1000); // ms를 초로 변환

  // 로딩 상태 표시
  const renderLoadingContent = () => (
    <div className="flex flex-col items-center justify-center flex-grow py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
      <div className="mt-4 text-lg">녹화 상태 확인 중...</div>
    </div>
  );

  // 녹화 중일 때의 내용
  const renderRecordingContent = () => (
    <div className="flex flex-col items-center justify-center flex-grow py-8">
      <div className="text-center mb-8">
        <div className="text-xl font-medium mb-3">녹화 진행 중...</div>
        <div className="relative inline-flex items-center">
          <div className="text-6xl font-digital tracking-wide font-semibold text-shadow-glow">
            {formattedDuration}
          </div>
          <div className="ml-3 h-3 w-3 bg-red-600 rounded-full animate-pulse"></div>
        </div>
      </div>

      <button
        onClick={handleStopCapture}
        className="py-3 px-6 bg-red-600 hover:bg-red-700 text-white rounded-lg text-lg font-medium"
      >
        작업 종료
      </button>
    </div>
  );

  // 녹화 중이 아닐 때의 내용
  const renderNormalContent = () => (
    <>
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
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {showBlurSelector ? "블러 완료" : "블러 영역 설정"}
                </button>
              )}
            />
          </div>

          {/* 안내 메시지 */}
          {!selectedWindowId && !isLoadingWindows && (
            <div className="mt-2 text-amber-600">
              캡처할 창을 선택해주세요. 목록이 비어있다면 녹화할 창을 열고
              새로고침을 눌러주세요.
            </div>
          )}

          {error && <div className="mt-2 text-red-500">오류: {error}</div>}
        </div>
      </div>

      {/* 블러 영역 선택기 */}
      {showBlurSelector && selectedWindowId && (
        <BlurRegionSelector
          windowId={selectedWindowId}
          activeWindows={activeWindows}
          blurRegions={blurRegions}
          onChange={handleBlurRegionsChange}
        />
      )}

      {/* 타이머 및 컨트롤 영역 */}
      {!showBlurSelector && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="flex flex-col">
            <TimelapseTimer
              isCapturing={isCapturing}
              duration={formattedDuration}
              isPaused={isPaused}
            />
          </div>
          <div className="flex flex-col">
            <TimelapseControls
              isCapturing={isCapturing}
              isPaused={isPaused}
              selectedWindowId={selectedWindowId}
              onStart={handleStartCapture}
              onStop={handleStopCapture}
              onCancel={handleCancelCapture}
              hasRecording={duration > 0}
            />
          </div>
        </div>
      )}

      {/* 작업 세션 시작 모달 */}
      {showSessionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-primary)] rounded-lg shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">새 작업 시작</h3>
              <button
                onClick={handleCloseSessionForm}
                className="text-[var(--text-muted)] hover:text-[var(--text-normal)]"
              >
                ✕
              </button>
            </div>
            <WorkspaceSessionForm
              onStartSession={handleStartSessionAndCapture}
              userTaskTypes={userTaskTypes}
              onAddTaskType={addTaskType}
              todaySessions={todaySessions}
            />
          </div>
        </div>
      )}

      {/* 타임랩스 생성 모달 */}
      {showGeneratePrompt && !isCapturing && (
        <GeneratePrompt
          onGenerate={handleGenerateTimelapse}
          onCancel={handleCancelCapture}
          isGenerating={isGeneratingTimelapse}
          progress={timelapseProgress}
          captureTime={duration / 1000} // ms를 초로 변환
          defaultSpeedFactor={timelapseOptions.speedFactor} // 설정에서 지정한 배속값 전달
        />
      )}
    </>
  );

  // 메인 컨텐츠 렌더링 결정
  const renderMainContent = () => {
    // 이미 캡처 중이라면 즉시 녹화 화면 표시
    if (isCapturing) {
      return renderRecordingContent();
    }

    // 상태 초기화 중이라면 로딩 화면 표시
    if (!isStatusInitialized) {
      return renderLoadingContent();
    }

    // 그 외에는 일반 화면 표시
    return renderNormalContent();
  };

  return (
    <div className="bg-[var(--bg-primary)] text-[var(--text-normal)] h-screen w-full flex flex-col p-3">
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md p-5 w-[98%] max-w-[1400px] min-w-auto mx-auto mb-5 h-[calc(100vh-30px)] overflow-y-auto">
        <h2 className="text-xl mb-4 font-semibold">타임랩스 워크스페이스</h2>
        {renderMainContent()}
      </div>
    </div>
  );
};

export default Timelapse;
