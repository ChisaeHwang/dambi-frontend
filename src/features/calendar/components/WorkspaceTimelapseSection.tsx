import React, { useContext } from "react";
import { useWorkSession } from "../../timelapse/hooks/useWorkSession";
import { AppContext } from "../../../context/AppContext";

/**
 * 시간을 읽기 쉬운 형식으로 변환하는 함수
 */
const formatDuration = (seconds: number): string => {
  if (seconds < 0) seconds = 0;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  let result = "";

  if (hours > 0) {
    result += `${hours}시간 `;
  }

  if (minutes > 0 || (hours > 0 && secs > 0)) {
    result += `${minutes}분 `;
  }

  if (hours === 0 && (minutes === 0 || secs > 0)) {
    result += `${secs}초`;
  }

  return result.trim();
};

/**
 * 워크스페이스 타임랩스 섹션 컴포넌트
 * 작업 상태를 표시하고 워크스페이스로 연결
 */
const WorkspaceTimelapseSection: React.FC = () => {
  const { setCurrentPage } = useContext(AppContext);
  const { activeSession, elapsedTime, isRecording, todaySessions } =
    useWorkSession();

  // 오늘 총 작업 시간 계산 (분 단위)
  const totalWorkTimeToday = todaySessions.reduce((total, session) => {
    // 완료된 작업(endTime이 있는 작업)만 포함
    if (session.endTime) {
      return total + session.duration;
    }
    return total;
  }, 0);

  // 작업 종류별 시간 계산
  const taskTypeStats = todaySessions.reduce(
    (stats: { [key: string]: number }, session) => {
      // 완료된 작업(endTime이 있는 작업)만 포함
      if (!session.endTime) {
        return stats;
      }

      // taskType만 사용하여 통계 집계 (녹화 여부는 별도로 집계하지 않음)
      const taskType = session.taskType || "기타";

      // "녹화" 카테고리는 건너뛰기 (이미 타입에서 해당 기능을 지원하므로 별도 카테고리로 표시할 필요 없음)
      if (taskType.toLowerCase() === "녹화") {
        return stats;
      }

      if (!stats[taskType]) {
        stats[taskType] = 0;
      }
      stats[taskType] += session.duration;
      return stats;
    },
    {}
  );

  // 워크스페이스로 이동 함수
  const navigateToWorkspace = () => {
    setCurrentPage("workspace");
  };

  return (
    <div className="bg-[var(--bg-secondary)] p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">오늘의 작업 현황</h3>
        <span className="text-sm text-[var(--text-muted)]">
          {new Date().toLocaleDateString("ko-KR", {
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      {activeSession ? (
        <div className="mb-4 p-3 bg-[var(--bg-accent)] rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-bold">{activeSession.title}</div>
              <div className="text-sm text-[var(--text-muted)]">
                {activeSession.taskType}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold">{formatDuration(elapsedTime)}</div>
              <div className="text-xs">
                {new Date(activeSession.startTime).toLocaleTimeString()} 시작
              </div>
            </div>
          </div>
          {isRecording && (
            <div className="mt-2 text-red-500 text-sm flex items-center">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1"></span>
              녹화 중
            </div>
          )}
        </div>
      ) : (
        <div className="mb-4 p-3 bg-[var(--bg-accent)] rounded-lg text-center text-sm">
          현재 활성화된 작업이 없습니다
        </div>
      )}

      <div className="mb-4">
        <div className="font-bold mb-2">오늘 총 작업 시간</div>
        <div className="text-xl font-bold">
          {Math.floor(totalWorkTimeToday / 60)}시간 {totalWorkTimeToday % 60}분
        </div>
      </div>

      {Object.keys(taskTypeStats).length > 0 && (
        <div className="mb-4">
          <div className="font-bold mb-2">작업 유형별 시간</div>
          <div className="space-y-2">
            {Object.entries(taskTypeStats).map(([type, minutes]) => (
              <div key={type} className="flex justify-between items-center">
                <span>{type}</span>
                <span className="font-medium">
                  {Math.floor(minutes / 60)}시간 {minutes % 60}분
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={navigateToWorkspace}
        className="block w-full py-3 px-4 bg-[var(--primary-color)] text-white text-center rounded-lg font-medium hover:opacity-90"
      >
        워크스페이스로 이동
      </button>
    </div>
  );
};

export default WorkspaceTimelapseSection;
