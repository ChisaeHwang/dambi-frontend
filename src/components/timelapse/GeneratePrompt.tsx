import React from "react";

interface GeneratePromptProps {
  onGenerate: () => void;
  onCancel: () => void;
}

const GeneratePrompt: React.FC<GeneratePromptProps> = ({
  onGenerate,
  onCancel,
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
      타임랩스를 만드시겠습니까?
    </p>

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
        style={{
          padding: "10px 20px",
          borderRadius: "4px",
          border: "none",
          backgroundColor: "#43b581",
          color: "#fff",
          cursor: "pointer",
          fontSize: "14px",
          minWidth: "100px",
        }}
      >
        예
      </button>
      <button
        onClick={onCancel}
        style={{
          padding: "10px 20px",
          borderRadius: "4px",
          border: "none",
          backgroundColor: "#ed4245",
          color: "#fff",
          cursor: "pointer",
          fontSize: "14px",
          minWidth: "100px",
        }}
      >
        아니오
      </button>
    </div>
  </div>
);

export default GeneratePrompt;
