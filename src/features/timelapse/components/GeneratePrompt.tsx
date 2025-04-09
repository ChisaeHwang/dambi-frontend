import React, { useState, useEffect } from "react";
import { TimelapseProgress } from "../types";
import { formatTime } from "../../../utils/timeUtils";

interface GeneratePromptProps {
  onGenerate: (speedFactor: number) => void;
  onCancel: () => void;
  isGenerating: boolean;
  progress: TimelapseProgress;
  captureTime: number; // 초 단위
  defaultSpeedFactor?: number; // 설정에서 지정한 기본 배속값
}

const GeneratePrompt: React.FC<GeneratePromptProps> = ({
  onGenerate,
  onCancel,
  isGenerating,
  progress,
  captureTime,
  defaultSpeedFactor = 6, // 기본값은 6배속
}) => {
  // 초기값을 설정에서 지정한 값으로 설정
  const [selectedSpeed, setSelectedSpeed] =
    useState<number>(defaultSpeedFactor);
  const [estimatedDuration, setEstimatedDuration] = useState<string>("");

  // 속도 옵션
  const speedOptions = [3, 6, 9, 20];

  // 녹화 시간을 기반으로 타임랩스 예상 시간 계산
  useEffect(() => {
    if (captureTime && captureTime > 0 && selectedSpeed > 0) {
      // 타임랩스 시간 = 원본 시간 / 속도
      const timelapseSeconds = Math.max(
        Math.ceil(captureTime / selectedSpeed),
        1
      );

      // 예상 시간 포맷팅
      setEstimatedDuration(formatTime(timelapseSeconds));
    } else {
      setEstimatedDuration("");
    }
  }, [captureTime, selectedSpeed]);

  // 속도 변경 핸들러
  const handleSpeedChange = (speed: number) => {
    setSelectedSpeed(speed);
  };

  // 타임랩스 생성 핸들러
  const handleGenerate = () => {
    onGenerate(selectedSpeed);
  };

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.7)] flex items-center justify-center z-50">
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-lg p-6 w-[90%] max-w-[450px]">
        {isGenerating ? (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-center">
              타임랩스 생성 중...
            </h3>
            <div className="mb-4 mt-5">
              <div className="text-center text-sm text-[var(--text-muted)] mb-1">
                {progress.stage || "처리 중"}
              </div>
              <div className="h-3 bg-[var(--bg-primary)] rounded-full">
                <div
                  className="h-full bg-[var(--primary-color)] rounded-full"
                  style={{ width: `${Math.min(progress.progress, 1) * 100}%` }}
                ></div>
              </div>
              <div className="text-right text-xs text-[var(--text-muted)] mt-1">
                {Math.min(Math.round(progress.progress * 100), 100)}%
              </div>
            </div>
            <p className="text-center text-sm text-[var(--text-muted)]">
              완료까지 잠시 기다려 주세요.
            </p>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-center">
              녹화 작업 완료
            </h3>

            <div className="mb-6">
              <p className="text-sm text-[var(--text-muted)] mb-4 text-center">
                녹화된 작업 화면으로 타임랩스를 생성할 준비가 되었습니다.
              </p>

              <div className="mb-5">
                <label className="block mb-3 text-sm font-medium text-center">
                  타임랩스 속도 선택
                </label>
                <div className="flex gap-2 justify-center">
                  {speedOptions.map((speed) => (
                    <button
                      key={speed}
                      className={`py-2 px-4 rounded border-none cursor-pointer transition-colors duration-200 text-sm ${
                        selectedSpeed === speed
                          ? "bg-blue-500 text-white"
                          : "bg-[var(--bg-tertiary)] text-[var(--text-normal)] hover:bg-[var(--bg-hover)]"
                      }`}
                      onClick={() => handleSpeedChange(speed)}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              {captureTime > 0 && (
                <div className="mb-5 py-3 px-4 bg-[var(--bg-tertiary)] rounded-lg">
                  <div className="text-sm text-center">
                    <div className="flex justify-between mb-2">
                      <span>녹화 시간:</span>
                      <span className="font-medium">
                        {formatTime(captureTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>예상 타임랩스 길이:</span>
                      <span className="font-medium text-blue-500">
                        {estimatedDuration || "계산 중..."}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center space-x-3">
              <button
                onClick={handleGenerate}
                className="py-2.5 px-5 rounded border-none bg-blue-500 hover:bg-blue-600 text-white font-medium cursor-pointer text-sm transition-colors duration-200"
              >
                타임랩스 생성
              </button>
              <button
                onClick={onCancel}
                className="py-2.5 px-5 rounded border-none bg-[var(--bg-tertiary)] text-[var(--text-normal)] font-medium cursor-pointer text-sm transition-colors duration-200 hover:bg-[var(--bg-hover)]"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneratePrompt;
