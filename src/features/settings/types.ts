/**
 * 설정 관련 타입 정의
 */

// 설정 섹션 타입
export interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

// 설정 옵션 타입
export interface SettingOptionProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}
