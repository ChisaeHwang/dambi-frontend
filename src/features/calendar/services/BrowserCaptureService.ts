import { WorkSession } from "../types";
import { timerService } from "./TimerService";
import { isElectronEnvironment } from "./ElectronSessionAdapter";

// 캡처 상태 타입
export interface BrowserCaptureState {
  isCapturing: boolean;
  isPaused: boolean;
  startTime: Date | null;
  pauseTime: Date | null;
  mediaStream: MediaStream | null;
  mediaRecorder: MediaRecorder | null;
  chunks: Blob[];
  windowTitle: string;
}

/**
 * 브라우저 환경에서 화면 캡처를 처리하는 서비스
 */
export class BrowserCaptureService {
  private state: BrowserCaptureState = {
    isCapturing: false,
    isPaused: false,
    startTime: null,
    pauseTime: null,
    mediaStream: null,
    mediaRecorder: null,
    chunks: [],
    windowTitle: "",
  };

  private listeners: Array<() => void> = [];

  constructor() {
    // 일렉트론 환경에서는 초기화하지 않음
    if (isElectronEnvironment()) {
      console.log(
        "일렉트론 환경에서는 BrowserCaptureService가 비활성화됩니다."
      );
      return;
    }

    // 브라우저 지원 여부 확인
    if (!this.isBrowserCaptureSupported()) {
      console.warn("이 브라우저는 화면 캡처를 지원하지 않습니다.");
    }
  }

  /**
   * 브라우저 캡처 기능 지원 여부 확인
   */
  isBrowserCaptureSupported(): boolean {
    return (
      navigator.mediaDevices !== undefined &&
      navigator.mediaDevices.getDisplayMedia !== undefined
    );
  }

  /**
   * 캡처 시작
   */
  async startCapture(
    options: {
      title?: string;
      category?: string;
      audio?: boolean;
      video?: MediaTrackConstraints;
    } = {}
  ): Promise<boolean> {
    if (isElectronEnvironment() || this.state.isCapturing) {
      return false;
    }

    try {
      // 화면 공유 권한 요청
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: options.video || true,
        audio: options.audio || false,
      });

      // MediaRecorder 설정
      const mediaRecorder = new MediaRecorder(mediaStream);
      const chunks: Blob[] = [];

      // 데이터 수집 이벤트
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      // 녹화 중지 이벤트
      mediaRecorder.onstop = () => {
        // 미디어 스트림 트랙 중지
        mediaStream.getTracks().forEach((track) => track.stop());

        // 세션 종료
        this.stopCapture();
      };

      // 녹화 시작
      mediaRecorder.start(1000); // 1초마다 데이터 수집

      // 상태 업데이트
      this.state = {
        isCapturing: true,
        isPaused: false,
        startTime: new Date(),
        pauseTime: null,
        mediaStream,
        mediaRecorder,
        chunks,
        windowTitle: options.title || document.title || "화면 캡처",
      };

      // 작업 세션 시작
      const sessionTitle = options.title || document.title || "화면 캡처";
      const category = options.category || "녹화";
      timerService.startSession(sessionTitle, category, "browser");

      // 리스너 알림
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error("화면 공유 시작 실패:", error);
      return false;
    }
  }

  /**
   * 캡처 중지
   */
  stopCapture(): boolean {
    if (!this.state.isCapturing) {
      return false;
    }

    try {
      // 미디어 레코더 중지
      if (
        this.state.mediaRecorder &&
        this.state.mediaRecorder.state !== "inactive"
      ) {
        this.state.mediaRecorder.stop();
      }

      // 미디어 스트림 트랙 중지
      if (this.state.mediaStream) {
        this.state.mediaStream.getTracks().forEach((track) => track.stop());
      }

      // 녹화 데이터 처리
      if (this.state.chunks.length > 0) {
        // 필요시 데이터 저장 로직 구현
        // 예: this.saveRecording();
      }

      // 작업 세션 종료
      const activeSession = timerService.getActiveSession();
      if (activeSession && activeSession.source === "browser") {
        timerService.stopSession();
      }

      // 상태 초기화
      this.state = {
        isCapturing: false,
        isPaused: false,
        startTime: null,
        pauseTime: null,
        mediaStream: null,
        mediaRecorder: null,
        chunks: [],
        windowTitle: "",
      };

      // 리스너 알림
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error("화면 공유 중지 실패:", error);
      return false;
    }
  }

  /**
   * 캡처 일시정지
   */
  pauseCapture(): boolean {
    if (!this.state.isCapturing || this.state.isPaused) {
      return false;
    }

    try {
      // 미디어 레코더 일시정지
      if (
        this.state.mediaRecorder &&
        this.state.mediaRecorder.state === "recording"
      ) {
        this.state.mediaRecorder.pause();
      }

      // 상태 업데이트
      this.state = {
        ...this.state,
        isPaused: true,
        pauseTime: new Date(),
      };

      // 작업 세션 일시정지
      const activeSession = timerService.getActiveSession();
      if (activeSession && activeSession.source === "browser") {
        timerService.pauseSession();
      }

      // 리스너 알림
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error("화면 공유 일시정지 실패:", error);
      return false;
    }
  }

  /**
   * 캡처 재개
   */
  resumeCapture(): boolean {
    if (!this.state.isCapturing || !this.state.isPaused) {
      return false;
    }

    try {
      // 미디어 레코더 재개
      if (
        this.state.mediaRecorder &&
        this.state.mediaRecorder.state === "paused"
      ) {
        this.state.mediaRecorder.resume();
      }

      // 상태 업데이트
      this.state = {
        ...this.state,
        isPaused: false,
        pauseTime: null,
      };

      // 작업 세션 재개
      const activeSession = timerService.getActiveSession();
      if (activeSession && activeSession.source === "browser") {
        timerService.resumeSession();
      }

      // 리스너 알림
      this.notifyListeners();

      return true;
    } catch (error) {
      console.error("화면 공유 재개 실패:", error);
      return false;
    }
  }

  /**
   * 현재 녹화 데이터 저장하기
   */
  saveRecording(): Blob | null {
    if (this.state.chunks.length === 0) {
      return null;
    }

    // Blob 생성
    const blob = new Blob(this.state.chunks, { type: "video/webm" });

    // 다운로드 링크 생성
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = url;
    a.download = `화면녹화_${new Date().toISOString().replace(/:/g, "-")}.webm`;
    a.click();

    // 정리
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return blob;
  }

  /**
   * 현재 캡처 상태 가져오기
   */
  getCaptureState(): BrowserCaptureState {
    return { ...this.state };
  }

  /**
   * 캡처 중인지 확인
   */
  isCapturing(): boolean {
    return this.state.isCapturing;
  }

  /**
   * 일시정지 상태인지 확인
   */
  isPaused(): boolean {
    return this.state.isPaused;
  }

  /**
   * 상태 변경 리스너 등록
   */
  addChangeListener(listener: () => void): () => void {
    this.listeners.push(listener);

    // 리스너 제거 함수 반환
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * 등록된 리스너들에게 알림
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error("BrowserCaptureService 리스너 오류:", error);
      }
    });
  }

  /**
   * 현재 브라우저 캡처 작업 세션 가져오기
   */
  getBrowserSession(): WorkSession | null {
    const activeSession = timerService.getActiveSession();
    if (activeSession && activeSession.source === "browser") {
      return activeSession;
    }
    return null;
  }
}

// 싱글톤 인스턴스 생성
export const browserCaptureService = new BrowserCaptureService();
