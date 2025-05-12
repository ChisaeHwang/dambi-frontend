/**
 * 포맷팅 관련 유틸리티 함수
 */
import { formatTotalMinutes, formatMinutes } from "../../../utils/timeUtils";

// 기존 formatTotalTime과 formatWorkTime 함수는 제거하고
// 대신 timeUtils.ts의 함수를 export하여 기존 코드와의 호환성 유지
export {
  formatTotalMinutes as formatTotalTime,
  formatMinutes as formatWorkTime,
};
