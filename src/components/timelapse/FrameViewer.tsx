import React from "react";

interface FrameViewerProps {
  currentFrame: number;
  frames: string[];
}

const FrameViewer: React.FC<FrameViewerProps> = ({ currentFrame, frames }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "450px",
        backgroundColor: "var(--bg-tertiary)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        marginTop: "16px",
        marginBottom: "16px",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      {frames.length > 0 && currentFrame < frames.length ? (
        <img
          src={`file://${frames[currentFrame]}`}
          alt={`프레임 ${currentFrame + 1}`}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain" as const,
          }}
        />
      ) : (
        <span style={{ color: "var(--text-muted)", fontSize: "16px" }}>
          선택된 이미지 없음
        </span>
      )}
    </div>
  );
};

export default FrameViewer;
