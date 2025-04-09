import React from "react";
import { SessionsListProps } from "../types";

/**
 * 세션 목록 컴포넌트
 */
const SessionsList: React.FC<SessionsListProps> = ({
  selectedDate,
  sessions,
}) => {
  // 날짜 포맷 함수
  const formatSessionTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분`;
  };

  // 모든 세션의 총 작업 시간 계산
  const totalWorkTime = sessions.reduce(
    (total, session) => total + session.duration,
    0
  );

  return (
    <div className="mt-5 border-t border-[var(--input-bg)] pt-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white text-base">
          {`${selectedDate.getFullYear()}년 ${
            selectedDate.getMonth() + 1
          }월 ${selectedDate.getDate()}일 작업`}
        </h3>

        {sessions.length > 0 && (
          <div className="text-sm text-[var(--text-positive)] font-medium bg-[var(--bg-modifier-accent)] py-1 px-3 rounded-full">
            총 {formatSessionTime(totalWorkTime)}
          </div>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="py-4 text-center text-[var(--text-muted)]">
          이 날짜에 기록된 작업이 없습니다.
        </div>
      ) : (
        <div>
          {sessions.map((session) => (
            <div
              key={session.id}
              className="p-3 mb-2 bg-[var(--bg-secondary)] rounded-lg border-l-4 border-l-[var(--primary-color)]"
            >
              <div className="flex justify-between mb-2">
                <span className="font-bold">{session.title}</span>
                <span className="text-xs bg-[var(--bg-modifier-accent)] px-2 py-0.5 rounded-full text-[var(--text-muted)]">
                  {session.category}
                </span>
              </div>
              <div className="flex justify-between text-sm text-[var(--text-muted)]">
                <span>
                  {session.date.getHours().toString().padStart(2, "0")}:
                  {session.date.getMinutes().toString().padStart(2, "0")}
                </span>
                <span>{formatSessionTime(session.duration)}</span>
              </div>
            </div>
          ))}

          {/* 작업 시간 분포 차트 */}
          <div className="mt-6 p-3 bg-[var(--bg-secondary)] rounded-lg">
            <h4 className="text-white text-sm mb-3">작업 시간 분포</h4>
            <div className="flex items-end h-32 space-x-1">
              {sessions.map((session, index) => {
                // 전체 작업 시간 중 비율 계산 (최대 높이 100%)
                const heightPercentage = Math.max(
                  10, // 최소 높이
                  Math.floor((session.duration / totalWorkTime) * 100)
                );

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className="w-full bg-[var(--primary-color)] rounded-t"
                      style={{ height: `${heightPercentage}%` }}
                    ></div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-1 overflow-hidden text-ellipsis w-full text-center">
                      {session.date.getHours()}:
                      {session.date.getMinutes().toString().padStart(2, "0")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionsList;
