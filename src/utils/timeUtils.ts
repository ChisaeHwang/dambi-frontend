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
