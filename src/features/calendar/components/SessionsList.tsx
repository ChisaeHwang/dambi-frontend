import React from "react";
import { WorkSession } from "../types";
import { formatWorkTime } from "../utils";

interface SessionsListProps {
  selectedDate: Date;
  sessions: WorkSession[];
  onEditSession?: (session: WorkSession) => void;
  onDeleteSession?: (sessionId: string) => void;
}

/**
 * 특정 날짜의 작업 세션 목록 컴포넌트
 */
const SessionsList: React.FC<SessionsListProps> = ({
  selectedDate,
  sessions,
  onEditSession,
  onDeleteSession,
}) => {
  if (sessions.length === 0) {
    return (
      <div className="p-4 bg-[var(--bg-secondary)] rounded-lg text-[var(--text-muted)] text-center">
        {selectedDate.toLocaleDateString()} 에 기록된 작업이 없습니다.
      </div>
    );
  }

  // 시작 시간 기준으로 정렬
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="space-y-3">
      {sortedSessions.map((session) => (
        <div
          key={session.id}
          className="p-4 bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-subtle)]"
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div>
              <h4 className="text-lg font-medium">{session.title}</h4>
              <div className="flex items-center mt-1 gap-2 flex-wrap">
                <span className="text-sm px-2 py-0.5 rounded bg-[var(--primary-color)] text-white">
                  {session.taskType}
                </span>
                <span className="text-sm text-[var(--text-muted)]">
                  {formatWorkTime(session.duration)}
                </span>
                {session.isRecording && session.isActive && (
                  <span className="text-sm px-2 py-0.5 rounded bg-red-500 text-white flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white mr-1 animate-pulse"></span>
                    녹화
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 sm:mt-0 text-sm text-[var(--text-muted)]">
              {new Date(session.startTime).toLocaleTimeString()} -
              {session.endTime
                ? new Date(session.endTime).toLocaleTimeString()
                : "진행 중"}
            </div>
          </div>

          {session.tags && session.tags.length > 0 && (
            <div className="mt-3 flex gap-1 flex-wrap">
              {session.tags.map((tag, index) => (
                <span
                  key={index}
                  className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--bg-hover)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SessionsList;
