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
