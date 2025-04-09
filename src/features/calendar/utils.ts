/**
 * 캘린더 관련 유틸리티 함수
 */

/**
 * 작업 시간(분)을 시간:분 형식으로 포맷팅
 * @param minutes 분 단위 시간
 * @returns 포맷팅된 시간 문자열
 */
export const formatTotalTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}시간 ${mins}분`;
};

/**
 * 작업 시간을 간략한 형식으로 포맷팅 (시간만 있거나 분만 있는 경우 처리)
 * @param minutes 분 단위 시간
 * @returns 포맷팅된 시간 문자열
 */
export const formatWorkTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}분`;
  }

  return `${hours}시간 ${mins > 0 ? `${mins}분` : ""}`;
};
