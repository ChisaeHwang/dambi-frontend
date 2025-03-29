/**
 * 시간 포맷 함수 (초 -> MM:SS)
 * @param seconds 초 단위 시간
 * @returns MM:SS 형식의 시간 문자열
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};
