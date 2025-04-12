import { WorkSession } from "../types";

export class SessionStorageService {
  private storageKey: string = "workSessions";

  /**
   * 모든 세션을 가져옵니다
   */
  getSessions(): WorkSession[] {
    const sessionsJson = localStorage.getItem(this.storageKey);
    if (!sessionsJson) return [];

    try {
      const sessions = JSON.parse(sessionsJson);
      return this.parseDates(sessions);
    } catch (error) {
      console.error("세션 데이터 파싱 오류:", error);
      return [];
    }
  }

  /**
   * 모든 세션을 가져옵니다.
   * @returns 저장된 모든 세션 배열
   */
  getAllSessions(): WorkSession[] {
    return this.getSessions();
  }

  /**
   * JSON에서 파싱된 세션의 날짜 객체를 변환
   */
  private parseDates(sessions: any[]): WorkSession[] {
    return sessions.map((session) => ({
      ...session,
      date: new Date(session.date),
      startTime: new Date(session.startTime),
      endTime: session.endTime ? new Date(session.endTime) : null,
    }));
  }

  // 세션 저장, 업데이트, 삭제 등 기타 메서드들...
}
