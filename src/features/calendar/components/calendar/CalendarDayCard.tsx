import React from "react";
import { formatWorkTime } from "../../utils/formatUtils";
import { CalendarDayCardProps } from "../../types";

/**
 * 캘린더 일자 카드 컴포넌트
 */
const CalendarDayCard: React.FC<CalendarDayCardProps> = ({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  sessionsCount,
  totalWorkTime,
  onSelectDate,
}) => {
  // 작업 시간에 따른 배경 색상 강도 계산
  const getWorkTimeIntensityClass = () => {
    if (!isCurrentMonth || totalWorkTime === 0) return "";

    // 작업 시간이 많을수록 더 진한 색상 (4단계)
    if (totalWorkTime > 300) return "bg-[#5865f233]"; // 5시간 이상
    if (totalWorkTime > 180) return "bg-[#5865f226]"; // 3시간 이상
    if (totalWorkTime > 60) return "bg-[#5865f219]"; // 1시간 이상
    return "bg-[#5865f20d]"; // 1시간 미만
  };

  return (
    <div
      onClick={() => onSelectDate(date)}
      className={`p-2 border border-[var(--border-color)] ${
        isSelected
          ? "bg-[var(--bg-modifier-selected)]"
          : isToday
          ? "bg-[var(--bg-modifier-active)]"
          : "bg-[var(--bg-primary)]"
      } ${getWorkTimeIntensityClass()} ${
        isCurrentMonth
          ? "text-[var(--text-normal)]"
          : "text-[var(--text-muted)]"
      } cursor-pointer rounded min-h-[90px] relative`}
    >
      <div
        className={`flex justify-center items-center w-6 h-6 rounded-full mb-1 ${
          isToday
            ? "bg-[var(--primary-color)] text-white font-bold"
            : "bg-transparent font-normal"
        }`}
      >
        {date.getDate()}
      </div>

      {isCurrentMonth && sessionsCount > 0 && (
        <>
          <div className="text-xs text-[var(--primary-color)] mt-1">
            {sessionsCount}개 작업
          </div>
          <div className="text-xs text-[var(--text-positive)] mt-0.5 font-medium">
            {formatWorkTime(totalWorkTime)}
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarDayCard;
