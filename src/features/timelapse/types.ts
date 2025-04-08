/**
 * 타임랩스 기능 관련 타입 정의
 */
import { NativeImage } from "../../types/common";

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

// 타임랩스 생성 진행 상황 인터페이스
export interface TimelapseProgress {
  status: "start" | "processing" | "complete" | "error";
  progress: number;
  stage: string;
  error?: string;
  outputPath?: string;
}
