import React from "react";
import { useActiveSession } from "../hooks/useActiveSession";
import { DateService } from "../services/DateService";

/**
 * 타이머 패널 컴포넌트 (워크스페이스 페이지로 이동하도록 안내)
 */
const TimerPanel: React.FC = () => {
  const { activeSession, formattedTime, isPaused } = useActiveSession();

  return (
    <div className="bg-[var(--bg-secondary)] p-4 rounded-lg shadow-md">
      {activeSession ? (
        // 활성 세션이 있을 경우 간단한 상태만 표시
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-bold">{activeSession.title}</h3>
            <span className="px-2 py-1 text-xs rounded bg-[var(--primary-color)] text-white">
              {activeSession.taskType}
            </span>
          </div>

          <div className="text-3xl font-bold text-center py-3">
            {formattedTime}
          </div>

          <div className="mt-4 text-sm text-[var(--text-muted)]">
            <div>
              시작:{" "}
              {activeSession.startTime
                ? new Date(activeSession.startTime).toLocaleTimeString()
                : new Date().toLocaleTimeString()}
            </div>
            <div>상태: {isPaused ? "일시정지" : "진행 중"}</div>
            {activeSession.isRecording && (
              <div className="text-red-500 flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1"></span>
                녹화 중
              </div>
            )}
          </div>
        </div>
      ) : (
        // 비활성 상태일 때 워크스페이스로 이동 안내
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-bold mb-3">작업 관리</h3>
          <p className="text-sm mb-4">현재 활성화된 작업 세션이 없습니다.</p>

          <div className="text-center">
            <p className="text-sm mb-2">
              작업은 워크스페이스 페이지에서 관리합니다.
            </p>
            <a
              href="/workspace"
              className="inline-block px-6 py-3 bg-[var(--primary-color)] text-white rounded-lg hover:opacity-90 w-full text-center"
            >
              워크스페이스로 이동
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimerPanel;
