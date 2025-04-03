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
    <div
      className="generate-prompt"
      style={{
        padding: "20px",
        marginTop: "20px",
        backgroundColor: "#40444b",
        borderRadius: "8px",
      }}
    >
      <p
        style={{
          fontSize: "16px",
          marginBottom: "16px",
          textAlign: "center",
          color: progress?.status === "error" ? "#ed4245" : "#fff",
        }}
      >
        {getStatusMessage()}
      </p>

      {isGenerating && progress && <TimelapseProgressBar progress={progress} />}

      {progress?.status === "error" && progress.error && (
        <div
          style={{
            margin: "16px 0",
            padding: "10px",
            backgroundColor: "rgba(237, 66, 69, 0.1)",
            borderRadius: "4px",
            color: "#ed4245",
            fontSize: "14px",
          }}
        >
          {formatErrorMessage(progress.error)}
        </div>
      )}

      {isGenerating && !progress && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "16px",
          }}
        >
          <div className="loading-spinner"></div>
        </div>
      )}

      <div
        className="prompt-buttons"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "12px",
          marginTop: "16px",
        }}
      >
        {progress?.status === "error" ? (
          // 오류 발생 시 다시 시도 버튼 표시
          <button
            onClick={onGenerate}
            style={{
              padding: "10px 20px",
              borderRadius: "4px",
              border: "none",
              backgroundColor: "#5865f2",
              color: "#fff",
              cursor: "pointer",
              fontSize: "14px",
              minWidth: "120px",
            }}
          >
            다시 시도
          </button>
        ) : (
          // 일반 상태일 때 예/아니오 버튼 표시
          <>
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              style={{
                padding: "10px 20px",
                borderRadius: "4px",
                border: "none",
                backgroundColor: isGenerating ? "#36794e" : "#43b581",
                color: "#fff",
                cursor: isGenerating ? "default" : "pointer",
                fontSize: "14px",
                minWidth: "100px",
                opacity: isGenerating ? 0.7 : 1,
              }}
            >
              예
            </button>
            <button
              onClick={onCancel}
              disabled={isGenerating}
              style={{
                padding: "10px 20px",
                borderRadius: "4px",
                border: "none",
                backgroundColor: isGenerating ? "#a52e31" : "#ed4245",
                color: "#fff",
                cursor: isGenerating ? "default" : "pointer",
                fontSize: "14px",
                minWidth: "100px",
                opacity: isGenerating ? 0.7 : 1,
              }}
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
