import React, { useState } from "react";
import { useActiveSession } from "../hooks/useActiveSession";
import { sessionStorageService } from "../utils";

/**
 * 타이머 패널 컴포넌트
 */
const TimerPanel: React.FC = () => {
  const {
    activeSession,
    formattedTime,
    isPaused,
    isElectron,
    startSession,
    stopSession,
    pauseSession,
    resumeSession,
    startCapture,
    stopCapture,
  } = useActiveSession();

  const [showNewSessionForm, setShowNewSessionForm] = useState<boolean>(false);
  const [newSessionTitle, setNewSessionTitle] = useState<string>("");
  const [newSessionTaskType, setNewSessionTaskType] = useState<string>("개발");
  const [newSessionRecording, setNewSessionRecording] =
    useState<boolean>(false);

  const [taskTypes, setTaskTypes] = useState<string[]>(() => {
    const savedTypes = localStorage.getItem("userTaskTypes");
    return savedTypes
      ? JSON.parse(savedTypes)
      : sessionStorageService.getSettings().categories || [
          "개발",
          "디자인",
          "회의",
          "기획",
          "리서치",
        ];
  });

  /**
   * 새 세션 시작 폼 제출 핸들러
   */
  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();

    // 녹화 옵션을 포함한 세션 시작
    const session = startSession(newSessionTitle, newSessionTaskType);

    // 세션이 생성되었고 녹화 옵션이 켜져 있다면 녹화 시작
    if (session && newSessionRecording && isElectron) {
      startCapture();
    }

    setShowNewSessionForm(false);
    setNewSessionTitle("");
  };

  /**
   * 캡처 시작 핸들러
   */
  const handleStartCapture = async () => {
    // 먼저 작업 세션 시작 폼 표시
    setNewSessionRecording(true);
    setShowNewSessionForm(true);
  };

  /**
   * 캡처 중지 핸들러
   */
  const handleStopCapture = async () => {
    await stopCapture();
    stopSession();
  };

  /**
   * 일시정지/재개 핸들러
   */
  const handlePauseResume = () => {
    if (isPaused) {
      resumeSession();
    } else {
      pauseSession();
    }
  };

  return (
    <div className="bg-[var(--bg-secondary)] p-4 rounded-lg shadow-md">
      {activeSession ? (
        // 활성 세션이 있을 경우 타이머 표시
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

          <div className="flex justify-center gap-2 mt-3">
            <button
              onClick={handlePauseResume}
              className="px-4 py-2 border rounded bg-[var(--bg-accent)] hover:bg-opacity-80"
            >
              {isPaused ? "재개" : "일시정지"}
            </button>
            <button
              onClick={handleStopCapture}
              className="px-4 py-2 bg-[var(--primary-color)] text-white rounded hover:opacity-90"
            >
              종료
            </button>
          </div>

          <div className="mt-4 text-sm text-[var(--text-muted)]">
            <div>시작: {activeSession.startTime.toLocaleTimeString()}</div>
            <div>
              {activeSession.isRecording && (
                <span className="text-red-500 flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1"></span>
                  녹화 중
                </span>
              )}
            </div>
          </div>
        </div>
      ) : showNewSessionForm ? (
        // 새 세션 시작 폼
        <form onSubmit={handleStartSession}>
          <h3 className="text-lg font-bold mb-3">새 작업 세션 시작</h3>

          <div className="mb-3">
            <label className="block text-sm mb-1">작업 제목</label>
            <input
              type="text"
              value={newSessionTitle}
              onChange={(e) => setNewSessionTitle(e.target.value)}
              className="w-full p-2 border rounded bg-[var(--bg-primary)]"
              placeholder="작업 제목을 입력하세요"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm mb-1">작업 유형</label>
            <select
              value={newSessionTaskType}
              onChange={(e) => setNewSessionTaskType(e.target.value)}
              className="w-full p-2 border rounded bg-[var(--bg-primary)]"
              required
            >
              {taskTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newSessionRecording}
                onChange={(e) => setNewSessionRecording(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">화면 녹화 포함</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowNewSessionForm(false)}
              className="px-3 py-1.5 border rounded"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-[var(--primary-color)] text-white rounded"
            >
              시작
            </button>
          </div>
        </form>
      ) : (
        // 비활성 상태일 때 시작 버튼
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-bold mb-3">작업 타이머</h3>
          <p className="text-sm mb-4">현재 활성화된 작업 세션이 없습니다.</p>

          <button
            onClick={handleStartCapture}
            className="px-6 py-3 bg-[var(--primary-color)] text-white rounded-lg hover:opacity-90 w-full"
          >
            {isElectron ? "화면 캡처 시작" : "작업 시작"}
          </button>

          <div className="mt-3 text-xs text-[var(--text-muted)]">
            {isElectron
              ? "일렉트론 환경에서 화면 캡처가 가능합니다."
              : "브라우저 환경에서는 화면 공유를 통해 작업을 기록할 수 있습니다."}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimerPanel;
