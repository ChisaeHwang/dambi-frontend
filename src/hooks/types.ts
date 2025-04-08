/**
 * 공통 타입 정의
 */

// 네이티브 이미지 인터페이스
export interface NativeImage {
  toDataURL: () => string;
  getSize: () => { width: number; height: number };
}

// 블러 영역 인터페이스
export interface BlurRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// 타임랩스 옵션 인터페이스
export interface TimelapseOptions {
  speedFactor: number; // 배속 요소 (3, 6, 9, 20 등)
  outputQuality: "low" | "medium" | "high";
  outputFormat: "mp4" | "gif";
  outputPath?: string; // 출력 경로
  preserveOriginals?: boolean; // 원본 이미지 보존 여부
  enabled?: boolean; // 타임랩스 활성화 여부
  blurRegions?: BlurRegion[]; // 블러 처리할 영역 목록
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  videoWidth?: number;
  videoHeight?: number;
}

// 캡처 상태 인터페이스
export interface CaptureStatus {
  isCapturing: boolean;
  duration: number;
  error?: string;
}

// 창 정보 인터페이스
export interface WindowInfo {
  id: string;
  name: string;
  // 기존 NativeImage 객체 (이전 버전 호환성 유지)
  thumbnail?: NativeImage;
  appIcon?: NativeImage;
  // Base64 인코딩된 썸네일 데이터 (새 버전에서 사용)
  thumbnailDataUrl?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  // 타임스탬프 (캐시 방지)
  timestamp: number;
  // 화면 여부
  isScreen?: boolean;
}

// 타임랩스 생성 진행 상황 인터페이스
export interface TimelapseProgress {
  status: "start" | "processing" | "complete" | "error";
  progress: number;
  stage: string;
  error?: string;
  outputPath?: string;
}

// 일렉트론 환경 확인
export const isElectronEnv = (): boolean => {
  return (
    typeof window !== "undefined" && typeof window.electron !== "undefined"
  );
};
