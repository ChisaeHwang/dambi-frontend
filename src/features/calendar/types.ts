/**
 * 캘린더 관련 타입 정의
 */

// 작업 세션 타입
export interface WorkSession {
  id: string;
  date: Date;
  startTime?: Date;
  endTime?: Date | null;
  duration: number; // 분 단위
  title: string; // 세부 작업 내용
  taskType: string; // 작업 유형 (개발, 디자인, 회의 등)
  isRecording?: boolean; // 녹화 여부
  source?: "electron" | "browser" | "manual"; // 작업 소스
  isActive?: boolean; // 활성 상태 여부
  tags?: string[]; // 선택적 태그 (필요시 사용)
}

// 캘린더 뷰 타입
export type CalendarViewType = "calendar" | "stats";

// 월별 통계 타입
export interface MonthStats {
  categoryStats: Record<string, number>;
  weekdayStats: number[];
  totalMonthTime: number;
}

// 캘린더 헤더 컴포넌트 props
export interface CalendarHeaderProps {
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

// 캘린더 그리드 컴포넌트 props
export interface CalendarGridProps {
  currentMonth: Date;
  selectedDate: Date;
  getSessionsForDate: (date: Date) => WorkSession[];
  onSelectDate: (date: Date) => void;
}

// 캘린더 일자 카드 컴포넌트 props
export interface CalendarDayCardProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  sessionsCount: number;
  totalWorkTime: number; // 총 작업 시간 (분)
  onSelectDate: (date: Date) => void;
}

// 세션 목록 컴포넌트 props
export interface SessionsListProps {
  selectedDate: Date;
  sessions: WorkSession[];
}

// 앱 설정 타입
export interface AppSettings {
  language: string;
  timezone: string;
  resetHour: number; // 리셋 시간 (0-23)
  categories: string[]; // 사용자 정의 카테고리
}
