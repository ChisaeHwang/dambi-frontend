/**
 * 창 관리 기능 관련 타입 정의
 */
import { NativeImage } from "../../types/common";

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
