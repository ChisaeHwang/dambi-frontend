import React from "react";
import { Calendar } from "../features/calendar";

/**
 * 캘린더 페이지
 * - 실제 작업은 Calendar 컴포넌트로 위임하며, 필요한 경우 페이지 레벨 로직 추가 가능
 */
const CalendarPage: React.FC = () => {
  return <Calendar />;
};

export default CalendarPage;
