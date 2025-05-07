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

  /**
   * 특정 타임존의 시간을 기준으로 날짜 객체 생성
   * @param date 기준 날짜
   * @param hour 시간 (0-23)
   * @param timezone 타임존 (기본값: 로컬 타임존)
   * @returns 지정된 시간과 타임존으로 설정된 날짜 객체
   */
  static getDateWithHourInTimezone(
    date: Date,
    hour: number,
    timezone?: string
  ): Date {
    // 타임존이 지정되지 않은 경우 로컬 타임존 사용
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    // 날짜 문자열 생성 (YYYY-MM-DD)
    const dateString = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    // 시간 문자열 생성 (HH:00:00)
    const timeString = `${String(hour).padStart(2, "0")}:00:00`;

    // 날짜와 시간을 타임존을 고려하여 Date 객체로 변환
    return new Date(
      `${dateString}T${timeString}${this.getTimezoneOffsetString(tz)}`
    );
  }

  /**
   * 타임존 문자열을 오프셋 문자열로 변환 (예: 'Asia/Seoul' -> '+09:00')
   * @param timezone 타임존 문자열
   * @returns 타임존 오프셋 문자열
   */
  static getTimezoneOffsetString(timezone: string): string {
    try {
      // 현재 시간을 기준으로 해당 타임존의 오프셋 계산
      const date = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        timeZoneName: "short",
      };

      // 타임존 정보만 추출
      const formatter = new Intl.DateTimeFormat("en-US", options);
      const parts = formatter.formatToParts(date);
      const timeZonePart = parts.find((part) => part.type === "timeZoneName");

      if (timeZonePart && timeZonePart.value) {
        // GMT+9와 같은 형식에서 오프셋 추출
        const match = timeZonePart.value.match(/GMT([+-]\d+)/);
        if (match && match[1]) {
          const offset = parseInt(match[1]);
          const hours = Math.abs(offset).toString().padStart(2, "0");
          const sign = offset >= 0 ? "+" : "-";
          return `${sign}${hours}:00`;
        }
      }

      // 추출 실패 시 현재 시스템의 오프셋을 문자열로 반환
      const offsetMinutes = date.getTimezoneOffset();
      const offsetHours = Math.abs(Math.floor(offsetMinutes / 60))
        .toString()
        .padStart(2, "0");
      const offsetMins = Math.abs(offsetMinutes % 60)
        .toString()
        .padStart(2, "0");
      const offsetSign = offsetMinutes <= 0 ? "+" : "-";
      return `${offsetSign}${offsetHours}:${offsetMins}`;
    } catch (error) {
      console.error("타임존 오프셋 변환 오류:", error);
      return "";
    }
  }

  /**
   * 특정 타임존에서 두 날짜가 같은 날인지 비교
   * @param date1 첫 번째 날짜
   * @param date2 두 번째 날짜
   * @param timezone 비교할 타임존 (기본값: 로컬 타임존)
   * @returns 같은 날이면 true, 아니면 false
   */
  static isSameDayInTimezone(
    date1: Date,
    date2: Date,
    timezone?: string
  ): boolean {
    // 타임존이 지정되지 않은 경우 로컬 타임존 사용
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    // 해당 타임존 기준으로 날짜 형식화
    const options: Intl.DateTimeFormatOptions = {
      timeZone: tz,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    };

    const formatter = new Intl.DateTimeFormat("en-US", options);
    return formatter.format(date1) === formatter.format(date2);
  }
}
