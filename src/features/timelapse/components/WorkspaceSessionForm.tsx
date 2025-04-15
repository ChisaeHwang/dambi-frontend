import React, { useState, useEffect } from "react";
import { WorkSession } from "../../calendar/types";

interface WorkspaceSessionFormProps {
  onStartSession: (
    session: Omit<WorkSession, "id" | "date" | "duration">
  ) => void;
  userTaskTypes: string[]; // 사용자가 정의한 작업 유형 목록
  onAddTaskType: (taskType: string) => void;
  isDisabled?: boolean;
  todaySessions?: WorkSession[]; // 오늘의 세션 목록 추가
}

/**
 * 워크스페이스에서 작업 세션을 시작하기 위한 폼 컴포넌트
 * - 작업 제목 제거 및 카테고리 중심으로 변경
 * - 같은 카테고리 작업 이어하기 기능 추가
 */
const WorkspaceSessionForm: React.FC<WorkspaceSessionFormProps> = ({
  onStartSession,
  userTaskTypes,
  onAddTaskType,
  isDisabled = false,
  todaySessions = [],
}) => {
  const [taskType, setTaskType] = useState<string>("");
  const [customTaskType, setCustomTaskType] = useState<string>("");
  const [showCustomTaskType, setShowCustomTaskType] = useState<boolean>(false);
  const [continueSession, setContinueSession] = useState<boolean>(false);

  // 오늘 이미 작업한 카테고리 목록
  const [todayCategories, setTodayCategories] = useState<string[]>([]);

  // 오늘 세션 분석하여 작업한 카테고리 목록 추출
  useEffect(() => {
    if (todaySessions && todaySessions.length > 0) {
      // Set 대신 filter와 includes를 사용하여 중복 제거
      const categories: string[] = [];
      todaySessions.forEach((session) => {
        if (!categories.includes(session.taskType)) {
          categories.push(session.taskType);
        }
      });
      setTodayCategories(categories);
    }
  }, [todaySessions]);

  // 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!taskType.trim()) {
      alert("작업 유형을 선택해주세요.");
      return;
    }

    // 현재 시간 기준으로 세션 생성
    const now = new Date();
    const finalTaskType =
      taskType === "custom" ? customTaskType.trim() : taskType;

    // 작업 세션 생성 - title과 taskType을 분리하여 "녹화" 카테고리 생성 방지
    const session: Omit<WorkSession, "id" | "date" | "duration"> = {
      title: finalTaskType + (continueSession ? " (이어서)" : ""), // 이어서 작업인 경우 표시
      taskType: finalTaskType, // 작업 유형은 그대로 유지
      startTime: now,
      endTime: null,
      isRecording: true, // 항상 녹화 활성화
      source: "manual",
      isActive: true,
      tags: [],
    };

    // 디버깅 로그 추가
    console.log("작업 세션 생성:", {
      title: session.title,
      taskType: session.taskType,
      isRecording: session.isRecording,
    });

    onStartSession(session);

    // 폼 초기화
    setCustomTaskType("");
    setShowCustomTaskType(false);
  };

  // 작업 유형 변경 핸들러
  const handleTaskTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTaskType(value);
    setShowCustomTaskType(value === "custom");

    // 선택한 작업이 오늘 이미 작업한 카테고리인지 확인
    if (todayCategories.includes(value)) {
      setContinueSession(true);
    } else {
      setContinueSession(false);
    }
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
                  {type}{" "}
                  {todayCategories.includes(type) ? "(오늘 작업 있음)" : ""}
                </option>
              ))}
              <option value="custom">직접 입력</option>
            </select>

            {/* 오늘 이미 같은 카테고리로 작업했을 경우 안내 메시지 */}
            {continueSession && (
              <div className="mt-1 text-green-600 text-sm">
                오늘 이미 이 카테고리로 작업했습니다. 이어서 작업합니다.
              </div>
            )}
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

          {/* 제출 버튼 */}
          <button
            type="submit"
            className="mt-2 px-4 py-2 bg-[var(--primary-color)] text-white rounded-md font-medium disabled:opacity-50"
            disabled={
              isDisabled ||
              !taskType.trim() ||
              (showCustomTaskType && !customTaskType.trim())
            }
          >
            {continueSession ? "이어서 작업 시작" : "새 작업 시작"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WorkspaceSessionForm;
