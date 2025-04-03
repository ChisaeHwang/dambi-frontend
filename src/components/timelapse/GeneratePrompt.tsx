import React from "react";
import { TimelapseProgress } from "../../hooks/useTimelapseGenerationCapture";
import TimelapseProgressBar from "./TimelapseProgressBar";

interface GeneratePromptProps {
  onGenerate: () => void;
  onCancel: () => void;
  isGenerating?: boolean;
  progress?: TimelapseProgress;
}

const GeneratePrompt: React.FC<GeneratePromptProps> = ({
  onGenerate,
  onCancel,
  isGenerating = false,
  progress,
}) => {
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
    <div className="p-5 mt-5 bg-[var(--input-bg)] rounded-lg">
      <p
        className={`text-base mb-4 text-center ${
          progress?.status === "error"
            ? "text-[var(--text-danger)]"
            : "text-white"
        }`}
      >
        {getStatusMessage()}
      </p>

      {isGenerating && progress && <TimelapseProgressBar progress={progress} />}

      {progress?.status === "error" && progress.error && (
        <div className="my-4 p-2.5 bg-[rgba(237,66,69,0.1)] rounded text-[var(--text-danger)] text-sm">
          {formatErrorMessage(progress.error)}
        </div>
      )}

      {isGenerating && !progress && (
        <div className="flex justify-center mb-4">
          <div className="loading-spinner"></div>
        </div>
      )}

      <div className="flex justify-center gap-3 mt-4">
        {progress?.status === "error" ? (
          // 오류 발생 시 다시 시도 버튼 표시
          <button
            onClick={onGenerate}
            className="py-2.5 px-5 rounded border-none bg-[var(--primary-color)] text-white cursor-pointer text-sm min-w-[120px]"
          >
            다시 시도
          </button>
        ) : (
          // 일반 상태일 때 예/아니오 버튼 표시
          <>
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className={`py-2.5 px-5 rounded border-none text-white text-sm min-w-[100px] ${
                isGenerating
                  ? "bg-[#36794e] cursor-default opacity-70"
                  : "bg-[var(--status-green)] cursor-pointer opacity-100"
              }`}
            >
              예
            </button>
            <button
              onClick={onCancel}
              disabled={isGenerating}
              className={`py-2.5 px-5 rounded border-none text-white text-sm min-w-[100px] ${
                isGenerating
                  ? "bg-[#a52e31] cursor-default opacity-70"
                  : "bg-[var(--text-danger)] cursor-pointer opacity-100"
              }`}
            >
              아니오
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default GeneratePrompt;
