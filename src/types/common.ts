/**
 * 공통 타입 정의
 */

// 네이티브 이미지 인터페이스
export interface NativeImage {
  toDataURL: () => string;
  getSize: () => { width: number; height: number };
}

// 일렉트론 환경 확인
export const isElectronEnv = (): boolean => {
  return (
    typeof window !== "undefined" && typeof window.electron !== "undefined"
  );
};
