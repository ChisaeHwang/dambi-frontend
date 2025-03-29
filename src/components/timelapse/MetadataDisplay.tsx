import React from "react";
import { TimelapseMetadata } from "../../hooks/useTimelapseSession";
import { formatTime } from "../../utils/timeUtils";

interface MetadataDisplayProps {
  metadata: TimelapseMetadata;
}

const MetadataDisplay: React.FC<MetadataDisplayProps> = ({ metadata }) => {
  return (
    <div
      style={{
        marginTop: "16px",
        padding: "16px",
        borderRadius: "var(--radius-md)",
        backgroundColor: "var(--bg-primary)",
        border: "1px solid var(--primary-color)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        <div>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "12px",
              marginBottom: "2px",
            }}
          >
            촬영 시간
          </div>
          <div>{formatTime(metadata.duration)}</div>
        </div>
        <div>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "12px",
              marginBottom: "2px",
            }}
          >
            프레임 수
          </div>
          <div>{metadata.frameCount}개</div>
        </div>
        <div>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "12px",
              marginBottom: "2px",
            }}
          >
            캡처 간격
          </div>
          <div>{metadata.interval}초</div>
        </div>
        <div>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "12px",
              marginBottom: "2px",
            }}
          >
            타임랩스 속도
          </div>
          <div>{metadata.speedFactor}배속</div>
        </div>
        <div>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "12px",
              marginBottom: "2px",
            }}
          >
            재생 시간
          </div>
          <div>{formatTime(metadata.playbackDuration)}</div>
        </div>
      </div>
    </div>
  );
};

export default MetadataDisplay;
