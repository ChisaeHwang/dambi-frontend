import React from "react";
import { CalendarHeaderProps } from "../types";

/**
 * 캘린더 헤더 컴포넌트
 */
const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentMonth,
  onPrevMonth,
  onNextMonth,
}) => (
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-white text-xl font-semibold m-0">작업 캘린더</h2>
    <div className="flex gap-2">
      <div className="text-white text-base font-medium">
        {`${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월`}
      </div>
      <div className="flex gap-1">
        <button
          onClick={onPrevMonth}
          className="bg-[var(--bg-accent)] border-none rounded text-white py-1 px-2 cursor-pointer"
        >
          이전
        </button>
        <button
          onClick={onNextMonth}
          className="bg-[var(--bg-accent)] border-none rounded text-white py-1 px-2 cursor-pointer"
        >
          다음
        </button>
      </div>
    </div>
  </div>
);

export default CalendarHeader;
