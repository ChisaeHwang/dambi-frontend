import React, { useState, useEffect } from "react";
import { WorkSession } from "../types";
import { sessionManager } from "../services/SessionManager";
import {
  formatDateForInput,
  formatTimeForInput,
  formatMinutes,
} from "../../../utils/timeUtils";
import { sessionStorageService } from "../services/SessionStorageService";
import { DateService } from "../services/DateService";

interface SessionFormProps {
  session?: WorkSession;
  onSave: (session: WorkSession) => void;
  onCancel: () => void;
}

/**
 * 작업 세션 폼 컴포넌트
 */
const SessionForm: React.FC<SessionFormProps> = ({
  session,
  onSave,
  onCancel,
}) => {
  const [title, setTitle] = useState<string>("");
  const [taskType, setTaskType] = useState<string>("개발");
  const [date, setDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [duration, setDuration] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [taskTypes, setTaskTypes] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // 초기 데이터 설정
  useEffect(() => {
    // 앱 설정에서 작업 유형 목록 가져오기
    const settings = sessionStorageService.getSettings();
    const savedTypes = localStorage.getItem("userTaskTypes");
    setTaskTypes(
      savedTypes
        ? JSON.parse(savedTypes)
        : settings.categories || ["개발", "디자인", "회의", "기획", "리서치"]
    );

    if (session) {
      // 기존 세션 편집
      setIsEditing(true);
      setTitle(session.title);
      setTaskType(session.taskType);
      // isRecording이 undefined일 경우 기본값 false로 설정
      setIsRecording(session.isRecording ?? false);
      setDate(formatDateForInput(session.date));
      // startTime이 undefined일 경우 현재 시간으로 설정
      setStartTime(
        session.startTime
          ? formatTimeForInput(session.startTime)
          : formatTimeForInput(new Date())
      );
      setEndTime(session.endTime ? formatTimeForInput(session.endTime) : "");
      setDuration(session.duration);
    } else {
      // 새 세션 추가
      setIsEditing(false);
      setTitle("");
      setTaskType("개발");
      setIsRecording(false);

      // 현재 날짜와 시간 설정
      const now = new Date();
      setDate(formatDateForInput(now));
      setStartTime(formatTimeForInput(now));
      setEndTime("");
      setDuration(30); // 기본 30분
    }
  }, [session]);

  // 시간 변경 시 자동으로 기간 계산
  useEffect(() => {
    if (startTime && endTime) {
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);

      if (end > start) {
        const durationMs = end.getTime() - start.getTime();
        const durationMinutes = Math.round(durationMs / (60 * 1000));
        setDuration(durationMinutes);
      }
    }
  }, [date, startTime, endTime]);

  // 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 날짜와 시간 객체 생성
    const sessionDate = new Date(date);
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = endTime ? new Date(`${date}T${endTime}`) : null;

    if (isEditing && session) {
      // 기존 세션 업데이트
      const updatedSession: WorkSession = {
        ...session,
        title,
        taskType,
        isRecording,
        date: sessionDate,
        startTime: startDateTime,
        endTime: endDateTime,
        duration: duration,
      };

      sessionManager.updateSession(updatedSession);
      onSave(updatedSession);
    } else {
      // 새 세션 생성 - createSession 함수 인자 변경
      const sessionData: Partial<WorkSession> = {
        title,
        taskType,
        date: sessionDate,
        duration,
        source: "manual",
        tags: [],
        startTime: startDateTime,
        endTime: endDateTime,
        isRecording,
      };

      const newSession = sessionManager.createSession(sessionData);
      onSave(newSession);
    }
  };

  // 기간 변경 핸들러
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDuration = parseInt(e.target.value);
    if (!isNaN(newDuration) && newDuration >= 0) {
      setDuration(newDuration);

      // 종료 시간 자동 계산
      if (startTime) {
        const start = new Date(`${date}T${startTime}`);
        const end = new Date(start.getTime() + newDuration * 60 * 1000);
        setEndTime(formatTimeForInput(end));
      }
    }
  };

  return (
    <div className="bg-[var(--bg-secondary)] p-5 rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-xl font-bold mb-4">
        {isEditing ? "작업 세션 편집" : "새 작업 세션 추가"}
      </h2>

      <form onSubmit={handleSubmit}>
        {/* 제목 입력 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border rounded bg-[var(--bg-primary)] text-[var(--text-normal)]"
            placeholder="작업 제목"
            required
          />
        </div>

        {/* 작업 유형 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">작업 유형</label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            className="w-full p-2 border rounded bg-[var(--bg-primary)] text-[var(--text-normal)]"
            required
          >
            {taskTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* 녹화 여부 */}
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isRecording}
              onChange={(e) => setIsRecording(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">화면 녹화 포함</span>
          </label>
        </div>

        {/* 날짜 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 border rounded bg-[var(--bg-primary)] text-[var(--text-normal)]"
            required
          />
        </div>

        {/* 시간 범위 */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">시작 시간</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full p-2 border rounded bg-[var(--bg-primary)] text-[var(--text-normal)]"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">종료 시간</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full p-2 border rounded bg-[var(--bg-primary)] text-[var(--text-normal)]"
            />
          </div>
        </div>

        {/* 작업 시간 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">
            작업 시간 (분) - {formatMinutes(duration)}
          </label>
          <input
            type="number"
            value={duration}
            onChange={handleDurationChange}
            className="w-full p-2 border rounded bg-[var(--bg-primary)] text-[var(--text-normal)]"
            min="1"
            required
          />
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--accent)] text-white rounded"
          >
            저장
          </button>
        </div>
      </form>
    </div>
  );
};

export default SessionForm;
