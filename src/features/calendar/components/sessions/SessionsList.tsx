import React from "react";
import { WorkSession } from "../../types";
import { formatWorkTime, filterOutRecordingSessions } from "../../utils";

interface SessionsListProps {
  selectedDate: Date;
  sessions: WorkSession[];
  onEditSession?: (session: WorkSession) => void;
  onDeleteSession?: (sessionId: string) => void;
}

/**
 * 특정 날짜의 작업 세션 목록 컴포넌트
 * - 작업 목록 대신 카테고리별 작업 시간 통계를 표시하도록 변경
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

  // "녹화" 카테고리를 제외한 세션 필터링
  const filteredSessions = filterOutRecordingSessions(sessions);

  // 필터링 후 세션이 없는 경우
  if (filteredSessions.length === 0) {
    return (
      <div className="p-4 bg-[var(--bg-secondary)] rounded-lg text-[var(--text-muted)] text-center">
        {selectedDate.toLocaleDateString()} 에 기록된 작업이 없습니다. (녹화
        세션만 존재합니다)
      </div>
    );
  }

  // 카테고리별 작업 시간 집계
  const categoryStats: Record<string, number> = {};
  let totalTime = 0;

  // 세션을 돌면서 카테고리별 작업 시간 누적
  filteredSessions.forEach((session) => {
    const category = session.taskType;

    if (!categoryStats[category]) {
      categoryStats[category] = 0;
    }
    categoryStats[category] += session.duration;
    totalTime += session.duration;
  });

  // 카테고리 항목을 작업 시간이 긴 순서대로 정렬
  const sortedCategories = Object.entries(categoryStats).sort(
    ([, timeA], [, timeB]) => timeB - timeA
  );

  return (
    <div className="space-y-3">
      {/* 총 작업 시간 요약 */}
      <div className="p-4 bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-subtle)]">
        <div className="text-lg font-medium text-center mb-2">
          총 작업 시간: {formatWorkTime(totalTime)}
        </div>
      </div>

      {/* 카테고리별 작업 시간 */}
      <div className="p-4 bg-[var(--bg-secondary)] rounded-lg shadow-sm border border-[var(--border-subtle)]">
        <h4 className="text-lg font-medium mb-3">카테고리별 작업 시간</h4>

        <div className="space-y-4">
          {sortedCategories.map(([category, duration]) => {
            const percentage = Math.round((duration / totalTime) * 100);

            // 카테고리별 색상 지정
            const barColor =
              category === "개발"
                ? "bg-[var(--primary-color)]"
                : category === "디자인"
                ? "bg-[var(--status-green)]"
                : category === "미팅"
                ? "bg-[var(--status-yellow)]"
                : category === "문서"
                ? "bg-[var(--text-link)]"
                : "bg-[var(--bg-accent)]";

            return (
              <div key={category} className="w-full">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{category}</span>
                  <span className="text-[var(--text-muted)]">
                    {formatWorkTime(duration)} ({percentage}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-[var(--bg-hover)] rounded-full">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SessionsList;
