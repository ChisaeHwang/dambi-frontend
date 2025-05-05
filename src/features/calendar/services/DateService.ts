/**
 * 날짜 관련 기능을 담당하는 서비스
 *
 * 단일 책임 원칙(SRP)에 따라 날짜 처리 로직만 담당
 * Date 객체 생성, 변환, 비교 등 관련 문제를 일관되게 해결
 */
export class DateService {
  /**
   * 문자열을 Date 객체로 안전하게 변환
   * @param dateString 날짜 문자열
   * @returns Date 객체
   */
  static fromString(dateString: string | null | undefined): Date | null {
    if (!dateString) return null;
    try {
      return new Date(dateString);
    } catch (error) {
      console.error("날짜 변환 오류:", error);
      return null;
    }
  }

  /**
   * 날짜를 ISO 문자열로 변환
   * @param date 날짜 객체
   * @returns ISO 형식 문자열
   */
  static toISOString(date: Date | null | undefined): string | null {
    if (!date) return null;
    try {
      return date.toISOString();
    } catch (error) {
      console.error("ISO 문자열 변환 오류:", error);
      return null;
    }
  }

  /**
   * 두 날짜가 같은 날인지 비교 (시간 무시)
   * @param date1 첫 번째 날짜
   * @param date2 두 번째 날짜
   * @returns 같은 날이면 true, 아니면 false
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * 날짜의 시간을 00:00:00으로 초기화
   * @param date 원본 날짜
   * @returns 시간이 초기화된 새 날짜 객체
   */
  static startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * 날짜의 시간을 23:59:59로 설정
   * @param date 원본 날짜
   * @returns 시간이 23:59:59로 설정된 새 날짜 객체
   */
  static endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }

  /**
   * 오늘 날짜 반환 (시간은 00:00:00)
   * @returns 오늘 날짜 객체
   */
  static today(): Date {
    return this.startOfDay(new Date());
  }

  /**
   * 두 날짜 사이의 차이를 밀리초로 반환
   * @param date1 첫 번째 날짜
   * @param date2 두 번째 날짜
   * @returns 차이(밀리초)
   */
  static diffInMs(date1: Date, date2: Date): number {
    return date2.getTime() - date1.getTime();
  }

  /**
   * 두 날짜 사이의 차이를 분으로 반환
   * @param date1 첫 번째 날짜
   * @param date2 두 번째 날짜
   * @returns 차이(분)
   */
  static diffInMinutes(date1: Date, date2: Date): number {
    return Math.floor(this.diffInMs(date1, date2) / (60 * 1000));
  }

  /**
   * JSON에서 Date 객체 복원
   * @param obj 복원할 객체
   * @returns Date 속성이 복원된 객체
   */
  static reviveDates<T>(obj: any): T {
    if (!obj || typeof obj !== "object") {
      return obj;
    }

    // Date 속성 복원
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];

        // 날짜 관련 필드 복원
        if (
          (key === "date" || key === "startTime" || key === "endTime") &&
          value !== null &&
          typeof value === "string"
        ) {
          obj[key] = new Date(value);
        }
        // 배열 또는 중첩 객체 처리
        else if (Array.isArray(value)) {
          obj[key] = value.map((item) => this.reviveDates(item));
        } else if (value !== null && typeof value === "object") {
          obj[key] = this.reviveDates(value);
        }
      }
    }

    return obj;
  }
}
