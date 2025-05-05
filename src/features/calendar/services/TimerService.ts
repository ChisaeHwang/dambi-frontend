import { WorkSession } from "../types";
import { sessionStorageService } from "../utils";

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
      if (savedSession.startTime && !savedSession.endTime) {
        const lastSaveTime = new Date(savedSession.startTime).getTime();
        const elapsedSinceLastSave = Date.now() - lastSaveTime;

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
    isRecording: boolean = false
  ): WorkSession {
    // 기존 세션이 있으면 중지
    if (this.activeSession) {
      this.stopSession();
    }

    // 새 세션 생성
    const now = new Date();
    const newSession: WorkSession = {
      id: Date.now().toString(),
      date: now,
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
   * 현재 경과 시간 가져오기 (분 단위)
   */
  getCurrentDuration(): number {
    if (!this.activeSession) {
      return 0;
    }

    // 현재 누적 시간 복사
    let currentAccumulated = this.accumulatedTime;

    // 타이머가 실행 중이면 경과 시간 추가
    if (this.timerInterval && !this.pausedTime) {
      currentAccumulated += Date.now() - this.startTime;
    }

    // 밀리초 -> 분 변환 후 반올림
    return Math.round(currentAccumulated / (60 * 1000));
  }

  /**
   * 활성 세션 가져오기
   */
  getActiveSession(): WorkSession | null {
    return this.activeSession;
  }

  /**
   * 타이머 이벤트 리스너 등록
   */
  addEventListener(listener: TimerEventListener): () => void {
    this.listeners.push(listener);

    // 리스너 제거 함수 반환
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * 활성 세션 여부 확인
   */
  isSessionActive(): boolean {
    return this.activeSession !== null && this.activeSession.isActive;
  }

  /**
   * 활성 세션 일시 정지 상태 확인
   */
  isSessionPaused(): boolean {
    return this.activeSession !== null && this.pausedTime > 0;
  }

  /**
   * 서비스 정리 (컴포넌트 unmount 시 호출)
   */
  cleanup(): void {
    this.stopTimer();

    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }

    this.autoSaveSession();

    window.removeEventListener("beforeunload", this.handleBeforeUnload);
  }

  /**
   * 언로드 이벤트 핸들러 (메모리 누수 방지를 위해 화살표 함수로 바인딩)
   */
  private handleBeforeUnload = () => {
    this.autoSaveSession();
  };

  /**
   * 상태 변경 알림 (의존성 역전 패턴)
   */
  private notifyStateChange(): void {
    if (this.onSessionStateChange) {
      this.onSessionStateChange(this.getSessionState());
    }
  }

  // 내부 헬퍼 메서드

  /**
   * 타이머 시작
   */
  private startTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerInterval = window.setInterval(() => {
      // 1초마다 이벤트 발생
      const duration = this.getCurrentDuration();
      this.notifyListeners("tick", this.activeSession, duration);
      this.notifyStateChange();
    }, 1000);
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
    if (!this.activeSession) {
      return;
    }

    // 일시 정지 중이면 정지 시점까지 계산
    if (this.pausedTime > 0) {
      this.accumulatedTime += this.pausedTime - this.startTime;
    } else if (this.startTime > 0) {
      // 아니면 현재 시점까지 계산
      this.accumulatedTime += Date.now() - this.startTime;
    }

    this.startTime = Date.now();
  }

  /**
   * 세션 자동 저장
   */
  private autoSaveSession(): void {
    if (!this.activeSession) {
      return;
    }

    // 현재 경과 시간으로 세션 업데이트
    const currentDuration = this.getCurrentDuration();

    const updatedSession: WorkSession = {
      ...this.activeSession,
      duration: currentDuration,
    };

    // 저장
    sessionStorageService.updateSession(updatedSession);
    sessionStorageService.saveActiveSession(updatedSession);

    // 활성 세션 업데이트
    this.activeSession = updatedSession;
  }

  /**
   * 이벤트 리스너들에게 알림
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
   * 오전 9시 리셋 확인
   * 오전 9시가 지났고, 마지막 리셋이 오늘 9시 이전이면 true 반환
   */
  checkDailyReset(): boolean {
    // 설정에서 리셋 시간 가져오기
    const settings = sessionStorageService.getSettings();
    const resetHour = settings.resetHour || 9;

    // 현재 시간
    const now = new Date();

    // 오늘 리셋 시간 (오전 9시)
    const todayReset = new Date(now);
    todayReset.setHours(resetHour, 0, 0, 0);

    // 마지막 리셋 시간 로드
    const lastResetStr = localStorage.getItem("last_reset_date");
    const lastReset = lastResetStr ? new Date(lastResetStr) : new Date(0);

    // 현재 시간이 오늘 리셋 시간 이후이고, 마지막 리셋이 오늘 리셋 시간 이전이면 리셋 필요
    if (now >= todayReset && lastReset < todayReset) {
      // 리셋 수행 (활성 세션 종료 및 새 세션 시작)
      if (this.activeSession) {
        const completedSession = this.stopSession();
        if (completedSession) {
          // 필요시 이전 세션 태그 추가 등 처리
          sessionStorageService.updateSession({
            ...completedSession,
            tags: [...(completedSession.tags || []), "자동종료"],
          });
        }
      }

      // 마지막 리셋 시간 업데이트
      localStorage.setItem("last_reset_date", now.toISOString());

      // 이벤트 발생
      this.notifyListeners("reset", null, 0);
      this.notifyStateChange();

      return true;
    }

    return false;
  }
}

// 싱글톤 인스턴스 생성
export const timerService = new TimerService();
