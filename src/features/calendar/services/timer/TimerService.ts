import { WorkSession } from "../../types";
import { sessionStorageService } from "../storage/SessionStorageService";
import { DateService } from "./DateService";
import { v4 as uuidv4 } from "uuid";

// 타이머 이벤트 타입
export type TimerEventType =
  | "start"
  | "stop"
  | "pause"
  | "resume"
  | "tick"
  | "reset";

// 타이머 이벤트 리스너 타입
export type TimerEventListener = (
  event: TimerEventType,
  session: WorkSession | null,
  duration: number
) => void;

// 세션 상태 타입 - 상태 관리 일관성을 위해 명시적으로 정의
export type SessionState = {
  session: WorkSession | null;
  duration: number; // 분 단위
  isActive: boolean;
  isPaused: boolean;
};

/**
 * 작업 시간 측정 및 관리를 위한 타이머 서비스
 *
 * 단일 책임: 시간 추적 및 타이머 관련 기능만 담당
 * 캡처 관련 로직은 별도 어댑터에 위임
 */
export class TimerService {
  private activeSession: WorkSession | null = null;
  private startTime: number = 0;
  private pausedTime: number = 0;
  private accumulatedTime: number = 0;
  private timerInterval: number | null = null;
  private listeners: TimerEventListener[] = [];
  private autoSaveInterval: number | null = null;

  // 세션 상태 변경 콜백 - 외부에서 주입 가능 (의존성 역전)
  private onSessionStateChange: ((state: SessionState) => void) | null = null;

  constructor() {
    // 초기화 시 이전 활성 세션 확인
    this.loadActiveSession();

    // 자동 저장 타이머 설정
    this.autoSaveInterval = window.setInterval(() => {
      this.autoSaveSession();
    }, 60000); // 1분마다 자동 저장

    // 페이지 언로드 시 세션 저장
    window.addEventListener("beforeunload", this.handleBeforeUnload);
  }

  /**
   * 상태 변경 콜백 설정 - 의존성 역전 원칙 적용
   * 외부 컴포넌트가 상태 변경을 구독할 수 있음
   */
  setStateChangeCallback(
    callback: ((state: SessionState) => void) | null | undefined
  ): void {
    this.onSessionStateChange = callback || null;
  }

  /**
   * 현재 세션 상태 반환
   */
  getSessionState(): SessionState {
    return {
      session: this.activeSession,
      duration: this.getCurrentDuration(),
      isActive: this.isSessionActive(),
      isPaused: this.isSessionPaused(),
    };
  }

  /**
   * 저장된 활성 세션 로드
   */
  private loadActiveSession(): void {
    const savedSession = sessionStorageService.getActiveSession();

    if (savedSession && savedSession.isActive) {
      this.activeSession = savedSession;

      // 마지막 저장 시점부터 현재까지의 경과 시간 계산
      if (savedSession.startTime) {
        // DateService 사용으로 Date 타입 안전성 확보
        const startTime = savedSession.startTime;
        const now = new Date();

        // 경과 시간 계산 시 DateService 사용으로 안전한 날짜 비교
        const elapsedSinceLastSave = DateService.diffInMs(startTime, now);

        // 세션 시작 시간 설정
        this.startTime = Date.now() - elapsedSinceLastSave;
        this.accumulatedTime = savedSession.duration * 60 * 1000; // 분 -> 밀리초

        // 타이머 재시작
        this.startTimer();
      }

      // 상태 변경 알림
      this.notifyStateChange();
    }
  }

  /**
   * 작업 세션 시작
   */
  startSession(
    title: string,
    taskType: string,
    source: "electron" | "browser" | "manual" = "manual",
    isRecording: boolean = false,
    sessionId?: string
  ): WorkSession {
    // 기존 세션이 있으면 중지
    if (this.activeSession) {
      this.stopSession();
    }

    // 새 세션 생성
    const now = new Date();
    const newSession: WorkSession = {
      id: sessionId || uuidv4(),
      date: DateService.startOfDay(now), // 날짜 정규화 (시간 부분 제거)
      startTime: now,
      endTime: null,
      duration: 0,
      title,
      taskType,
      isRecording,
      source,
      isActive: true,
      tags: [],
    };

    // 세션 저장
    this.activeSession = newSession;
    sessionStorageService.addSession(newSession);
    sessionStorageService.saveActiveSession(newSession);

    // 타이머 초기화 및 시작
    this.startTime = Date.now();
    this.accumulatedTime = 0;
    this.pausedTime = 0;
    this.startTimer();

    // 이벤트 발생
    this.notifyListeners("start", newSession, 0);
    this.notifyStateChange();

    return newSession;
  }

  /**
   * 작업 세션 중지
   */
  stopSession(): WorkSession | null {
    if (!this.activeSession) {
      return null;
    }

    // 타이머 중지
    this.stopTimer();

    // 누적 시간 업데이트
    this.updateAccumulatedTime();

    // 세션 업데이트
    const completedSession: WorkSession = {
      ...this.activeSession,
      endTime: new Date(),
      duration: Math.round(this.accumulatedTime / (60 * 1000)), // 밀리초 -> 분
      isActive: false,
    };

    // 업데이트된 세션 저장
    sessionStorageService.updateSession(completedSession);
    sessionStorageService.saveActiveSession(null);

    // 이벤트 발생
    this.notifyListeners("stop", completedSession, completedSession.duration);

    // 세션 종료
    const returnSession = { ...completedSession };
    this.activeSession = null;
    this.accumulatedTime = 0;

    // 상태 변경 알림
    this.notifyStateChange();

    return returnSession;
  }

  /**
   * 작업 세션 일시 정지
   */
  pauseSession(): void {
    if (!this.activeSession || !this.timerInterval) {
      return;
    }

    this.stopTimer();
    this.pausedTime = Date.now();
    this.updateAccumulatedTime();

    // 이벤트 발생
    const duration = Math.round(this.accumulatedTime / (60 * 1000));
    this.notifyListeners("pause", this.activeSession, duration);
    this.notifyStateChange();
  }

  /**
   * 작업 세션 재개
   */
  resumeSession(): void {
    if (!this.activeSession || this.timerInterval) {
      return;
    }

    // 일시 정지 시간만큼 시작 시간 조정
    if (this.pausedTime > 0) {
      const pauseDuration = Date.now() - this.pausedTime;
      this.startTime += pauseDuration;
      this.pausedTime = 0;
    }

    this.startTimer();

    // 이벤트 발생
    const duration = Math.round(this.accumulatedTime / (60 * 1000));
    this.notifyListeners("resume", this.activeSession, duration);
    this.notifyStateChange();
  }

  /**
   * 활성 세션 업데이트 (외부에서 세션 속성 변경 시 사용)
   * 세션 ID가 같을 때만 업데이트
   */
  updateActiveSession(session: WorkSession): boolean {
    if (!this.activeSession || this.activeSession.id !== session.id) {
      return false;
    }

    this.activeSession = { ...session, isActive: true };
    sessionStorageService.updateSession(this.activeSession);
    sessionStorageService.saveActiveSession(this.activeSession);
    this.notifyStateChange();
    return true;
  }

  /**
   * 현재 세션 지속 시간 계산 (분 단위)
   */
  getCurrentDuration(): number {
    if (!this.activeSession) {
      return 0;
    }

    // 기본 누적 시간
    let totalMs = this.accumulatedTime;

    // 활성 상태인 경우 현재까지의 추가 시간 계산
    if (this.isSessionActive() && !this.isSessionPaused()) {
      totalMs += Date.now() - this.startTime;
    }

    // 분 단위로 변환 (반올림)
    return Math.round(totalMs / (60 * 1000));
  }

  /**
   * 활성 세션 가져오기
   */
  getActiveSession(): WorkSession | null {
    return this.activeSession;
  }

  /**
   * 이벤트 리스너 등록
   */
  addEventListener(listener: TimerEventListener): () => void {
    this.listeners.push(listener);

    // 리스너 제거 함수 반환
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * 세션 활성 상태 확인
   */
  isSessionActive(): boolean {
    return Boolean(this.activeSession && this.activeSession.isActive);
  }

  /**
   * 세션 일시 정지 상태 확인
   */
  isSessionPaused(): boolean {
    return this.isSessionActive() && this.pausedTime > 0;
  }

  /**
   * 서비스 정리 함수
   */
  cleanup(): void {
    // 타이머 정리
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // 자동 저장 타이머 정리
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }

    // 이벤트 리스너 제거
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
  }

  /**
   * 페이지 언로드 시 세션 저장
   */
  private handleBeforeUnload = () => {
    this.autoSaveSession();
  };

  /**
   * 상태 변경 알림
   */
  private notifyStateChange(): void {
    if (this.onSessionStateChange) {
      const state = this.getSessionState();
      this.onSessionStateChange(state);
    }
  }

  /**
   * 타이머 시작
   */
  private startTimer(): void {
    // 기존 타이머가 있으면 중지
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    // 새 타이머 시작
    this.timerInterval = window.setInterval(() => {
      const duration = this.getCurrentDuration();
      this.notifyListeners("tick", this.activeSession, duration);
    }, 1000); // 1초마다 업데이트
  }

  /**
   * 타이머 중지
   */
  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  /**
   * 누적 시간 업데이트
   */
  private updateAccumulatedTime(): void {
    if (this.isSessionActive() && !this.isSessionPaused()) {
      const currentTime = Date.now();
      const additionalTime = currentTime - this.startTime;
      this.accumulatedTime += additionalTime;
      this.startTime = currentTime;
    }
  }

  /**
   * 세션 자동 저장
   */
  private autoSaveSession(): void {
    if (!this.activeSession || !this.isSessionActive()) {
      return;
    }

    // 세션 활성 상태인 경우만 저장
    if (this.isSessionActive()) {
      // 누적 시간 업데이트
      this.updateAccumulatedTime();

      // 세션 상태 업데이트 (일시 정지 상태 유지)
      const updatedSession: WorkSession = {
        ...this.activeSession,
        duration: Math.round(this.accumulatedTime / (60 * 1000)), // 밀리초 -> 분
      };

      // 저장
      sessionStorageService.updateSession(updatedSession);
      sessionStorageService.saveActiveSession(updatedSession);
    }
  }

  /**
   * 이벤트 리스너 알림
   */
  private notifyListeners(
    event: TimerEventType,
    session: WorkSession | null,
    duration: number
  ): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event, session, duration);
      } catch (error) {
        console.error("타이머 이벤트 리스너 오류:", error);
      }
    });
  }

  /**
   * 일일 리셋 시간 확인 (사용자 설정 기반)
   * 하루가 바뀌었는지 확인하여 활성 세션을 종료할지 결정
   */
  checkDailyReset(): boolean {
    if (!this.activeSession || !this.activeSession.startTime) {
      return false;
    }

    // 현재 시간
    const now = new Date();

    // 시작 시간
    const startTime = new Date(this.activeSession.startTime);

    // 사용자 설정에서 리셋 시간과 타임존 가져오기
    const settings = sessionStorageService.getSettings();
    const resetHour = settings.resetHour;
    const timezone = settings.timezone;

    // 사용자 타임존 기준으로 오늘 날짜의 리셋 시간 생성
    const resetTime = DateService.getDateWithHourInTimezone(
      now,
      resetHour,
      timezone
    );

    // 현재 시간이 리셋 시간 이후이고, 세션이 리셋 시간 이전에 시작되었는지 확인
    const isAfterReset = now.getTime() >= resetTime.getTime();

    // 세션 시작일이 현재 날짜와 다르거나, 같은 날이지만 리셋 시간 이전에 시작된 경우
    const isStartedBeforeReset = DateService.isSameDayInTimezone(
      startTime,
      now,
      timezone
    )
      ? startTime.getTime() < resetTime.getTime()
      : !DateService.isSameDayInTimezone(startTime, now, timezone);

    // 리셋이 필요한 경우
    const needsReset = isAfterReset && isStartedBeforeReset;

    if (needsReset && this.isSessionActive()) {
      console.log(
        `[타이머 서비스] 일일 리셋 수행 (리셋 시간: ${resetHour}시, 타임존: ${timezone})`
      );
      // 세션 중지하고 리셋 이벤트 발생
      this.stopSession();
      this.notifyListeners("reset", null, 0);
      return true;
    }

    return false;
  }
}

// 싱글톤 인스턴스 생성
export const timerService = new TimerService();
