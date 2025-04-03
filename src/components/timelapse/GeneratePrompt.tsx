import React from "react";

interface GeneratePromptProps {
  onGenerate: () => void;
  onCancel: () => void;
  isGenerating?: boolean;
}

const GeneratePrompt: React.FC<GeneratePromptProps> = ({
  onGenerate,
  onCancel,
  isGenerating = false,
}) => (
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
      }}
    >
      {isGenerating ? "타임랩스 생성 중..." : "타임랩스를 만드시겠습니까?"}
    </p>

    {isGenerating && (
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
      }}
    >
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
    </div>
  </div>
);

export default GeneratePrompt;
