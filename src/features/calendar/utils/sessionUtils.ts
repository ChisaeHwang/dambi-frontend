/**
 * 세션 관련 유틸리티 함수
 */
import { WorkSession } from "../types";

/**
 * "녹화" 카테고리인지 확인하는 함수
 * @param session 작업 세션
 * @returns 녹화 카테고리인 경우 true, 아니면 false
 */
export const isRecordingCategory = (session: WorkSession): boolean => {
  return Boolean(session.taskType && session.taskType.toLowerCase() === "녹화");
};

/**
 * "녹화" 카테고리를 제외한 세션 필터링
 * @param sessions 작업 세션 배열
 * @returns "녹화" 카테고리가 아닌 세션만 포함된 배열
 */
export const filterOutRecordingSessions = (
  sessions: WorkSession[]
): WorkSession[] => {
  return sessions.filter((session) => !isRecordingCategory(session));
};
