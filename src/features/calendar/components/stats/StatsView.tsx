import React from "react";
import { MonthStats } from "../../types";
import { formatTotalTime } from "../../utils";

interface StatsViewProps {
  currentMonth: Date;
  monthStats: MonthStats;
}

/**
 * 월별 통계 뷰 컴포넌트
 */
const StatsView: React.FC<StatsViewProps> = ({ currentMonth, monthStats }) => {
  // 요일 이름
  const weekdayNames = ["월", "화", "수", "목", "금", "토", "일"];

  return (
    <div className="stats-view">
      <div className="mb-6">
        <h3 className="text-white text-lg mb-4 font-medium">
          {`${currentMonth.getFullYear()}년 ${
            currentMonth.getMonth() + 1
          }월 작업 통계`}
        </h3>

        <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg mb-4">
          <div className="text-center mb-2 text-[var(--text-positive)] text-lg font-semibold">
            총 작업 시간: {formatTotalTime(monthStats.totalMonthTime)}
          </div>
        </div>
      </div>

      {/* 카테고리별 작업 시간 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg">
          <h4 className="text-white text-base mb-4">카테고리별 작업 시간</h4>

          {Object.keys(monthStats.categoryStats).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(monthStats.categoryStats).map(
                ([category, duration]) => {
                  const percentage = Math.round(
                    (duration / monthStats.totalMonthTime) * 100
                  );
                  const barColor =
                    category === "개발"
                      ? "bg-[var(--primary-color)]"
                      : category === "디자인"
                      ? "bg-[var(--status-green)]"
                      : category === "미팅"
                      ? "bg-[var(--status-yellow)]"
                      : category === "문서"
                      ? "bg-[var(--text-link)]"
                      : "bg-[var(--bg-accent)]";

                  return (
                    <div key={category} className="w-full">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">{category}</span>
                        <span className="text-sm text-[var(--text-muted)]">
                          {formatTotalTime(duration)} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-[var(--bg-secondary)] rounded-full">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-[var(--text-muted)]">
              작업 데이터가 없습니다.
            </div>
          )}
        </div>

        {/* 요일별 작업 시간 */}
        <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg">
          <h4 className="text-white text-base mb-4">요일별 작업 시간</h4>

          {monthStats.weekdayStats.some((time) => time > 0) ? (
            <div className="flex items-end h-48 space-x-1">
              {monthStats.weekdayStats.map((duration, index) => {
                const maxValue = Math.max(...monthStats.weekdayStats);
                const heightPercentage =
                  maxValue > 0
                    ? Math.max(5, Math.round((duration / maxValue) * 100))
                    : 0;

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center flex-1"
                  >
                    <div
                      className={`w-full ${
                        index < 5
                          ? "bg-[var(--primary-color)]"
                          : "bg-[var(--status-yellow)]"
                      } rounded-t`}
                      style={{ height: `${heightPercentage}%` }}
                    ></div>
                    <div className="text-xs text-[var(--text-muted)] mt-2">
                      {weekdayNames[index]}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {Math.floor(duration / 60)}시간
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-[var(--text-muted)]">
              작업 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsView;
