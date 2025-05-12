/**
 * 날짜 관련 유틸리티 함수
 */

/**
 * Date 객체를 ISO 문자열로 변환 후 다시 Date 객체로 복원하는 함수
 * 로컬 스토리지에 저장할 때 Date 객체가 문자열로 변환되는 문제를 해결
 */
export const reviveDates = <T>(obj: T): T => {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }

  // Date 문자열을 Date 객체로 변환
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key as keyof T];

      // 'date', 'startTime', 'endTime' 속성 확인 및 변환
      if (key === "date" || key === "startTime" || key === "endTime") {
        if (value !== null && typeof value === "string") {
          (obj as any)[key] = new Date(value);
        }
      }
      // 배열 또는 객체인 경우 재귀 처리
      else if (Array.isArray(value)) {
        (obj as any)[key] = value.map((item) => reviveDates(item));
      } else if (value !== null && typeof value === "object") {
        (obj as any)[key] = reviveDates(value);
      }
    }
  }

  return obj;
}; 