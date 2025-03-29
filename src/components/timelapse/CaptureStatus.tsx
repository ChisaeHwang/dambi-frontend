import React from "react";
import { formatTime } from "../../utils/timeUtils";

interface CaptureStatusProps {
  frameCount: number;
  duration: number;
  estimatedPlaybackDuration: number;
  speedFactor: number;
}

const CaptureStatus: React.FC<CaptureStatusProps> = ({
  frameCount,
  duration,
  estimatedPlaybackDuration,
  speedFactor,
}) => {
  return (
    <div className="discord-card capture-status">
      <div className="discord-card-header">
        <div className="discord-card-title">
          <div className="status-indicator online"></div>
          <span>캡처 세션 상태</span>
        </div>
        <div className="discord-card-actions">
          <div className="discord-tag">진행 중</div>
        </div>
      </div>

      <div className="discord-card-content">
        <div className="discord-status-item">
          <div className="discord-status-icon">📸</div>
          <div className="discord-status-info">
            <div className="discord-status-label">캡처 프레임</div>
            <div className="discord-status-value">{frameCount}개</div>
          </div>
        </div>

        <div className="discord-status-item">
          <div className="discord-status-icon">⏱️</div>
          <div className="discord-status-info">
            <div className="discord-status-label">경과 시간</div>
            <div className="discord-status-value">{formatTime(duration)}</div>
          </div>
        </div>

        <div className="discord-status-item">
          <div className="discord-status-icon">⏰</div>
          <div className="discord-status-info">
            <div className="discord-status-label">재생 시간 (예상)</div>
            <div className="discord-status-value">
              {formatTime(estimatedPlaybackDuration)}
            </div>
          </div>
        </div>

        <div className="discord-status-item">
          <div className="discord-status-icon">🔄</div>
          <div className="discord-status-info">
            <div className="discord-status-label">타임랩스 속도</div>
            <div className="discord-status-value">{speedFactor}배속</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaptureStatus;
