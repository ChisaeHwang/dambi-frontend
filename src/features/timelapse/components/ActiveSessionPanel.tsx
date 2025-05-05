import React from "react";
import { WorkSession } from "../../calendar/types";
import { formatDuration } from "../../../utils/timeUtils";

interface ActiveSessionPanelProps {
  activeSession: WorkSession | null;
  onPauseSession: () => void;
  onResumeSession: () => void;
  onStopSession: () => void;
  elapsedTime: number; // 초 단위
  isRecording?: boolean;
}

/**
 * 현재 활성화된 작업 세션 정보를 표시하는 컴포넌트
 */
const ActiveSessionPanel: React.FC<ActiveSessionPanelProps> = ({
  activeSession,
  onPauseSession,
  onResumeSession,
  onStopSession,
  elapsedTime,
  isRecording = false,
}) => {
  if (!activeSession) {
    return (
      <div className="bg-[var(--bg-accent)] p-4 rounded-lg text-center">
        <p className="text-lg">활성 작업이 없습니다</p>
        <p className="text-sm text-[var(--text-muted)]">새 작업을 시작하세요</p>
      </div>
    );
  }

  const formattedElapsedTime = formatDuration(elapsedTime);
  const isPaused =
    activeSession.isActive === false && activeSession.endTime === null;

  // 시작 시간 렌더링 함수
  const renderStartTime = () => {
    if (activeSession.startTime) {
      return new Date(activeSession.startTime).toLocaleTimeString();
    }
    return new Date().toLocaleTimeString();
  };

  return (
    <div className="bg-[var(--bg-accent)] p-4 rounded-lg">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold">현재 작업</h3>
        <div className="flex items-center gap-2">
          {isRecording && (
            <span className="inline-flex items-center">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1"></span>
              <span className="text-xs text-red-500">녹화 중</span>
            </span>
          )}
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-xl font-bold mb-1">{activeSession.title}</h4>
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="px-2 py-1 bg-[var(--primary-color)] text-white rounded-md text-xs">
            {activeSession.taskType}
          </span>
        </div>
      </div>

      <div className="text-center mb-4">
        <div className="text-3xl font-bold font-mono">
          {formattedElapsedTime}
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          {renderStartTime()} 시작
        </p>
      </div>

      <div className="flex gap-2">
        {isPaused ? (
          <button
            onClick={onResumeSession}
            className="flex-1 py-2 px-4 bg-[var(--primary-color)] text-white rounded-md"
          >
            재개
          </button>
        ) : (
          <button
            onClick={onPauseSession}
            className="flex-1 py-2 px-4 bg-[var(--bg-secondary)] rounded-md"
          >
            일시정지
          </button>
        )}
        <button
          onClick={onStopSession}
          className="flex-1 py-2 px-4 bg-red-600 text-white rounded-md"
        >
          종료
        </button>
      </div>
    </div>
  );
};

export default ActiveSessionPanel;
