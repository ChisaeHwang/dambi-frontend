import React, { useState, useEffect } from "react";
import { TimelapseProgress } from "../../hooks/useTimelapseGenerationCapture";
import TimelapseProgressBar from "./TimelapseProgressBar";

interface GeneratePromptProps {
  onGenerate: (speedFactor: number) => void;
  onCancel: () => void;
  onResumeCapture: () => void;
  isGenerating: boolean;
  progress: TimelapseProgress;
  duration: number;
  defaultSpeedFactor: number;
  timelapseEnabled?: boolean;
}

const GeneratePrompt: React.FC<GeneratePromptProps> = ({
  onGenerate,
  onCancel,
  onResumeCapture,
  isGenerating,
  progress,
  duration,
  defaultSpeedFactor,
  timelapseEnabled = true,
}) => {
  const [selectedSpeed, setSelectedSpeed] =
    useState<number>(defaultSpeedFactor);
  const [estimatedDuration, setEstimatedDuration] = useState<string>("");

  // 속도 옵션
  const speedOptions = [3, 6, 9, 20];

  // 녹화 시간을 기반으로 타임랩스 예상 시간 계산
  useEffect(() => {
    console.log("Duration(초):", duration, "Speed:", selectedSpeed); // 디버깅용

    if (duration && duration > 0 && selectedSpeed > 0) {
      // duration이 밀리초 단위로 들어오는 경우를 대비해 초 단위로 변환
      // 00:01:14는 74초
      let durationInSeconds = duration;
      // 만약 duration이 비정상적으로 크다면 밀리초 단위일 수 있음
      if (duration > 10000) {
        durationInSeconds = Math.floor(duration / 1000);
      }

      // 타임랩스 시간 = 원본 시간 / 속도
      const timelapseSeconds = Math.max(
        Math.ceil(durationInSeconds / selectedSpeed),
        1
      );

      console.log(
        "원본 시간(초):",
        durationInSeconds,
        "타임랩스 시간(초):",
        timelapseSeconds
      );

      // 예상 시간 포맷팅
      const minutes = Math.floor(timelapseSeconds / 60);
      const seconds = timelapseSeconds % 60;

      let timeText = "";
      if (minutes > 0) {
        timeText += `${minutes}분 `;
      }
      timeText += `${seconds}초`;

      console.log("Estimated Duration:", timeText); // 디버깅용
      setEstimatedDuration(timeText);
    } else {
      setEstimatedDuration("");
    }
  }, [duration, selectedSpeed]);

  // 속도 변경 핸들러
  const handleSpeedChange = (speed: number) => {
    setSelectedSpeed(speed);
  };

  // 타임랩스 생성 핸들러
  const handleGenerate = () => {
    onGenerate(selectedSpeed);
  };

  // 사용자 친화적인 상태 메시지 생성
  const getStatusMessage = () => {
    if (!isGenerating) return "타임랩스를 만드시겠습니까?";

    if (!progress) return "타임랩스 생성 준비 중...";

    switch (progress.status) {
      case "start":
        return "타임랩스 생성 초기화 중...";
      case "processing":
        return `타임랩스 생성 중... (${progress.progress}%)`;
      case "complete":
        return "타임랩스 생성 완료!";
      case "error":
        return "타임랩스 생성 중 오류가 발생했습니다";
      default:
        return `타임랩스 생성 중... (${progress?.stage || ""})`;
    }
  };

  // 사용자 친화적인 오류 메시지 변환
  const formatErrorMessage = (error?: string) => {
    if (!error) return "";

    if (error.includes("FFmpeg 오류 코드")) {
      return "비디오 변환 중 오류가 발생했습니다. 다른 설정으로 다시 시도해보세요.";
    }

    return error;
  };

  return (
    <div className="mt-5 p-5 bg-[var(--bg-accent)] rounded-lg shadow-md text-center">
      {!timelapseEnabled ? (
        <div className="py-4">
          <h3 className="text-lg font-semibold mb-3">
            타임랩스가 비활성화되었습니다
          </h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            타임랩스 기능이 꺼져 있어 작업 화면이 저장되지 않았습니다. 설정에서
            타임랩스를 활성화해주세요.
          </p>
          <button
            onClick={onCancel}
            className="py-2.5 px-5 rounded border-none bg-[var(--bg-secondary)] text-[var(--text-normal)] font-medium cursor-pointer text-sm transition-colors duration-200 hover:bg-[var(--bg-hover)]"
          >
            확인
          </button>
        </div>
      ) : isGenerating ? (
        <div>
          <h3 className="text-lg font-semibold mb-3">타임랩스 생성 중...</h3>
          <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-[var(--primary-color)] transition-all duration-300 ease-in-out"
              style={{ width: `${progress.progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-[var(--text-muted)]">{progress.stage}</p>
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold mb-4">녹화 작업 완료</h3>

          <div className="mb-5">
            <p className="text-sm text-[var(--text-muted)] mb-4">
              녹화를 다시 시작하거나, 타임랩스를 생성할 수 있습니다.
            </p>

            <div className="mb-5">
              <label className="block mb-2 text-sm font-medium">
                타임랩스 속도
              </label>
              <div className="flex gap-2 justify-center">
                {speedOptions.map((speed) => (
                  <button
                    key={speed}
                    className={`py-2 px-4 rounded border-none cursor-pointer transition-colors duration-200 text-sm ${
                      selectedSpeed === speed
                        ? "bg-[var(--primary-color)] text-white"
                        : "bg-[var(--bg-secondary)] text-[var(--text-normal)] hover:bg-[var(--bg-accent)]"
                    }`}
                    onClick={() => handleSpeedChange(speed)}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {duration > 0 && (
              <div className="mb-5 py-3 px-4 bg-[var(--bg-secondary)] rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">예상 타임랩스 길이:</span>{" "}
                  <span className="text-[var(--primary-color)] font-semibold">
                    {estimatedDuration || "계산 중..."}
                  </span>
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {selectedSpeed}배속으로 처리 시 예상 시간입니다
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-center space-x-3">
            <button
              onClick={onResumeCapture}
              className="py-2.5 px-5 rounded border border-[var(--primary-color)] bg-transparent text-[var(--primary-color)] font-medium cursor-pointer text-sm transition-colors duration-200 hover:bg-[rgba(var(--primary-color-rgb),0.1)]"
            >
              다시 녹화
            </button>
            <button
              onClick={handleGenerate}
              className="py-2.5 px-5 rounded border-none bg-[var(--primary-color)] text-white font-medium cursor-pointer text-sm transition-colors duration-200 hover:bg-[var(--primary-color-hover)]"
            >
              타임랩스 생성
            </button>
            <button
              onClick={onCancel}
              className="py-2.5 px-5 rounded border-none bg-[var(--bg-secondary)] text-[var(--text-normal)] font-medium cursor-pointer text-sm transition-colors duration-200 hover:bg-[var(--bg-hover)]"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneratePrompt;
