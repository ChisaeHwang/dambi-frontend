/**
 * 시간 포맷팅 유틸리티
 * 앱 전체에서 사용되는 시간 포맷팅 함수 모음
 */

/**
 * 시간(초)을 00:00:00 형식으로 포맷팅하는 함수
 * @param seconds 포맷팅할 시간(초)
 * @returns 포맷팅된 시간 문자열 (00:00:00)
 */
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const padZero = (num: number): string => {
    return num.toString().padStart(2, "0");
  };

  return `${padZero(hours)}:${padZero(minutes)}:${padZero(secs)}`;
};

/**
 * 초 단위 시간을 읽기 쉬운 형식으로 변환
 * 입력된 시간에 따라 "1시간 30분", "45분", "30초" 등으로 표시
 * @param seconds 변환할 시간(초)
 * @returns 변환된 문자열
 */
export const formatDuration = (seconds: number): string => {
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
 * 분 단위 시간을 읽기 쉬운 형식으로 변환 (항상 시간과 분을 표시)
 * @param minutes 변환할 시간(분)
 * @returns "X시간 Y분" 형식의 문자열
 */
export const formatTotalMinutes = (minutes: number): string => {
  if (minutes < 0) minutes = 0;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours}시간 ${mins}분`;
};

/**
 * 분 단위 시간을 읽기 쉬운 형식으로 변환 (0인 단위는 생략)
 * @param minutes 변환할 시간(분)
 * @returns 시간이 0이면 "Y분", 아니면 "X시간 Y분" 형식의 문자열
 */
export const formatMinutes = (minutes: number): string => {
  if (minutes < 0) minutes = 0;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}분`;
  }

  return `${hours}시간 ${mins > 0 ? `${mins}분` : ""}`;
};

/**
 * Date 객체를 입력 폼에 적합한 날짜 문자열(YYYY-MM-DD)로 변환
 * @param date 변환할 Date 객체
 * @returns YYYY-MM-DD 형식의 문자열
 */
export const formatDateForInput = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

/**
 * Date 객체를 입력 폼에 적합한 시간 문자열(HH:MM)로 변환
 * @param date 변환할 Date 객체
 * @returns HH:MM 형식의 문자열
 */
export const formatTimeForInput = (date: Date): string => {
  return date.toTimeString().substring(0, 5);
};

/**
 * 초 단위 시간을 분으로 변환
 * @param seconds 초 단위 시간
 * @returns 분 단위 시간
 */
export const secondsToMinutes = (seconds: number): number => {
  return Math.floor(seconds / 60);
};

/**
 * 분 단위 시간을 초로 변환
 * @param minutes 분 단위 시간
 * @returns 초 단위 시간
 */
export const minutesToSeconds = (minutes: number): number => {
  return minutes * 60;
};
