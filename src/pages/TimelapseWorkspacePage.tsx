import React, { useState } from "react";
import {
  useWorkSession,
  WorkspaceSessionForm,
  ActiveSessionPanel,
  Timelapse,
} from "../features/timelapse";
import { formatDuration } from "../utils/timeUtils";

/**
 * 타임랩스 워크스페이스 페이지
 * - 작업 세션 시작, 관리 및 타임랩스 기능을 제공
 */
const TimelapseWorkspacePage: React.FC = () => {
  const [showTimelapse, setShowTimelapse] = useState<boolean>(false);

  const {
    activeSession,
    elapsedTime,
    isRecording,
    todaySessions,
    userTaskTypes,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
    addTaskType,
  } = useWorkSession();

  // 오늘 총 작업 시간 계산 (분 단위)
  const totalWorkTimeToday = todaySessions.reduce((total, session) => {
    return total + session.duration;
  }, 0);

  // 작업 종류별 시간 계산
  const taskTypeStats = todaySessions.reduce(
    (stats: { [key: string]: number }, session) => {
      const taskType = session.taskType || "기타";
      if (!stats[taskType]) {
        stats[taskType] = 0;
      }
      stats[taskType] += session.duration;
      return stats;
    },
    {}
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] text-[var(--text-normal)] p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">워크스페이스</h1>

        <div className="flex items-center gap-2">
          <div className="text-sm px-3 py-1 bg-[var(--bg-secondary)] rounded-md">
            오늘 총 작업: {formatDuration(totalWorkTimeToday * 60)}
          </div>

          <button
            onClick={() => setShowTimelapse(!showTimelapse)}
            className={`px-4 py-1.5 rounded text-sm ${
              showTimelapse
                ? "bg-[var(--primary-color)] text-white"
                : "bg-[var(--bg-accent)] text-[var(--text-normal)]"
            }`}
          >
            {showTimelapse ? "작업 관리" : "타임랩스"}
          </button>
        </div>
      </div>

      {showTimelapse ? (
        // 타임랩스 화면
        <Timelapse />
      ) : (
        // 작업 관리 화면
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
          <div className="flex flex-col gap-6">
            <div className="bg-[var(--bg-secondary)] p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">오늘의 작업 현황</h2>

              {/* 작업 요약 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[var(--bg-accent)] p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">총 작업 시간</h3>
                  <p className="text-2xl font-bold">
                    {formatDuration(totalWorkTimeToday * 60)}
                  </p>
                </div>

                <div className="bg-[var(--bg-accent)] p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">작업 세션 수</h3>
                  <p className="text-2xl font-bold">{todaySessions.length}개</p>
                </div>

                <div className="bg-[var(--bg-accent)] p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">현재 상태</h3>
                  <p className="text-2xl font-bold">
                    {activeSession?.isActive ? "작업 중" : "대기 중"}
                  </p>
                </div>
              </div>

              {/* 작업 유형별 시간 통계 */}
              {Object.keys(taskTypeStats).length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-2">작업 유형별 시간</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(taskTypeStats).map(([type, minutes]) => (
                      <div
                        key={type}
                        className="flex justify-between items-center bg-[var(--bg-tertiary)] p-3 rounded"
                      >
                        <span>{type}</span>
                        <span className="font-medium">
                          {formatDuration(minutes * 60)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 오늘의 작업 목록 */}
            <div className="bg-[var(--bg-secondary)] p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">오늘의 작업 목록</h2>

              {todaySessions.length === 0 ? (
                <p className="text-center py-4 text-[var(--text-muted)]">
                  오늘 작업 기록이 없습니다
                </p>
              ) : (
                <div className="overflow-auto max-h-[400px]">
                  <table className="w-full">
                    <thead className="bg-[var(--bg-tertiary)]">
                      <tr>
                        <th className="p-2 text-left">제목</th>
                        <th className="p-2 text-left">유형</th>
                        <th className="p-2 text-left">시작 시간</th>
                        <th className="p-2 text-left">소요 시간</th>
                        <th className="p-2 text-left">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todaySessions.map((session) => (
                        <tr
                          key={session.id}
                          className="border-b border-[var(--border-color)]"
                        >
                          <td className="p-2">{session.title}</td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 bg-[var(--primary-color)] text-white rounded-md text-xs">
                              {session.taskType}
                            </span>
                          </td>
                          <td className="p-2">
                            {new Date(session.startTime).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </td>
                          <td className="p-2">
                            {formatDuration(session.duration * 60)}
                          </td>
                          <td className="p-2">
                            {session.isActive ? (
                              <span className="text-green-500">진행 중</span>
                            ) : (
                              <span>완료</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* 사이드바 - 작업 시작 및 현재 작업 관리 */}
          <div className="flex flex-col gap-6">
            {/* 현재 작업 상태 패널 */}
            <ActiveSessionPanel
              activeSession={activeSession}
              onPauseSession={pauseSession}
              onResumeSession={resumeSession}
              onStopSession={stopSession}
              elapsedTime={elapsedTime}
              isRecording={isRecording}
            />

            {/* 작업 시작 폼 */}
            <WorkspaceSessionForm
              onStartSession={startSession}
              userTaskTypes={userTaskTypes}
              onAddTaskType={addTaskType}
              isDisabled={activeSession?.isActive === true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelapseWorkspacePage;
