import React, { useState } from "react";
import { WorkSession } from "../../calendar/types";

interface WorkspaceSessionFormProps {
  onStartSession: (
    session: Omit<WorkSession, "id" | "date" | "duration">
  ) => void;
  userTaskTypes: string[]; // 사용자가 정의한 작업 유형 목록
  onAddTaskType: (taskType: string) => void;
  isDisabled?: boolean;
}

/**
 * 워크스페이스에서 작업 세션을 시작하기 위한 폼 컴포넌트
 */
const WorkspaceSessionForm: React.FC<WorkspaceSessionFormProps> = ({
  onStartSession,
  userTaskTypes,
  onAddTaskType,
  isDisabled = false,
}) => {
  const [title, setTitle] = useState<string>("");
  const [taskType, setTaskType] = useState<string>("");
  const [customTaskType, setCustomTaskType] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [showCustomTaskType, setShowCustomTaskType] = useState<boolean>(false);

  // 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("작업 제목을 입력해주세요.");
      return;
    }

    // 현재 시간 기준으로 세션 생성
    const now = new Date();

    const session: Omit<WorkSession, "id" | "date" | "duration"> = {
      title: title.trim(),
      taskType: taskType === "custom" ? customTaskType.trim() : taskType,
      startTime: now,
      endTime: null,
      isRecording,
      source: "manual",
      isActive: true,
      tags: [],
    };

    onStartSession(session);

    // 폼 초기화
    setTitle("");
    setCustomTaskType("");
    setShowCustomTaskType(false);
  };

  // 작업 유형 변경 핸들러
  const handleTaskTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTaskType(value);
    setShowCustomTaskType(value === "custom");
  };

  // 사용자 정의 작업 유형 추가 핸들러
  const handleAddTaskType = () => {
    if (
      customTaskType.trim() &&
      !userTaskTypes.includes(customTaskType.trim())
    ) {
      onAddTaskType(customTaskType.trim());
      setTaskType(customTaskType.trim());
      setCustomTaskType("");
      setShowCustomTaskType(false);
    }
  };

  return (
    <div className="bg-[var(--bg-accent)] p-4 rounded-lg">
      <h3 className="text-lg font-bold mb-4">새 작업 시작</h3>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-4">
          {/* 작업 제목 */}
          <div className="flex flex-col">
            <label htmlFor="title" className="mb-1 font-medium">
              작업 제목
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md"
              placeholder="작업 내용을 입력하세요"
              disabled={isDisabled}
              required
            />
          </div>

          {/* 작업 유형 */}
          <div className="flex flex-col">
            <label htmlFor="taskType" className="mb-1 font-medium">
              작업 유형
            </label>
            <select
              id="taskType"
              value={taskType}
              onChange={handleTaskTypeChange}
              className="px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md"
              disabled={isDisabled}
            >
              <option value="">작업 유형 선택</option>
              {userTaskTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
              <option value="custom">직접 입력</option>
            </select>
          </div>

          {/* 사용자 정의 작업 유형 */}
          {showCustomTaskType && (
            <div className="flex gap-2">
              <input
                type="text"
                value={customTaskType}
                onChange={(e) => setCustomTaskType(e.target.value)}
                className="flex-1 px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-md"
                placeholder="새 작업 유형 입력"
                disabled={isDisabled}
              />
              <button
                type="button"
                onClick={handleAddTaskType}
                className="px-3 py-2 bg-[var(--primary-color)] text-white rounded-md"
                disabled={!customTaskType.trim() || isDisabled}
              >
                추가
              </button>
            </div>
          )}

          {/* 녹화 여부 */}
          <div className="flex items-center gap-2">
            <input
              id="isRecording"
              type="checkbox"
              checked={isRecording}
              onChange={(e) => setIsRecording(e.target.checked)}
              className="w-4 h-4"
              disabled={isDisabled}
            />
            <label htmlFor="isRecording" className="font-medium">
              화면 녹화 포함
            </label>
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            className="mt-2 px-4 py-2 bg-[var(--primary-color)] text-white rounded-md font-medium disabled:opacity-50"
            disabled={
              isDisabled ||
              !title.trim() ||
              (showCustomTaskType && !customTaskType.trim())
            }
          >
            작업 시작
          </button>
        </div>
      </form>
    </div>
  );
};

export default WorkspaceSessionForm;
