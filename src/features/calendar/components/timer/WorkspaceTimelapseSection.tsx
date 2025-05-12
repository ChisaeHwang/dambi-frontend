import React, { useContext } from "react";
import { useWorkSession } from "../../../timelapse/hooks/useWorkSession";
import { AppContext } from "../../../../context/AppContext";
import { filterOutRecordingSessions } from "../../utils/sessionUtils";
import { formatDuration, formatMinutes } from "../../../../utils/timeUtils";

/**
 * 워크스페이스 타임랩스 섹션 컴포넌트
 * 작업 상태를 표시하고 워크스페이스로 연결
 */
const WorkspaceTimelapseSection: React.FC = () => {
  const { setCurrentPage } = useContext(AppContext);
  const { activeSession, elapsedTime, isRecording, todaySessions } =
    useWorkSession();

  // "녹화" 카테고리를 제외한 세션만 필터링
  const filteredSessions = filterOutRecordingSessions(todaySessions);

  // 오늘 총 작업 시간 계산 (분 단위) - "녹화" 카테고리 제외
  const totalWorkTimeToday = filteredSessions.reduce((total, session) => {
    // 완료된 작업(endTime이 있는 작업)만 포함
    if (session.endTime) {
      return total + session.duration;
    }
    return total;
  }, 0);

  // 작업 종류별 시간 계산
  const taskTypeStats = filteredSessions.reduce(
    (stats: { [key: string]: number }, session) => {
      // 완료된 작업(endTime이 있는 작업)만 포함
      if (!session.endTime) {
        return stats;
      }

      // taskType만 사용하여 통계 집계
      const taskType = session.taskType || "기타";

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

  // 시작 시간 표시 형식
  const getStartTimeDisplay = () => {
    if (!activeSession) return "";

    if (activeSession.startTime) {
      return new Date(activeSession.startTime).toLocaleTimeString();
    } else {
      return new Date().toLocaleTimeString();
    }
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
              <div className="text-xs">{getStartTimeDisplay()} 시작</div>
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
          {formatMinutes(totalWorkTimeToday)}
        </div>
      </div>

      {Object.keys(taskTypeStats).length > 0 && (
        <div className="mb-4">
          <div className="font-bold mb-2">작업 유형별 시간</div>
          <div className="space-y-2">
            {Object.entries(taskTypeStats).map(([type, minutes]) => (
              <div key={type} className="flex justify-between items-center">
                <span>{type}</span>
                <span className="font-medium">{formatMinutes(minutes)}</span>
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
