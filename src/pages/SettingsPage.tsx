import React from "react";
import { Settings } from "../features/settings";

/**
 * 설정 페이지
 * - 실제 작업은 Settings 컴포넌트로 위임하며, 필요한 경우 페이지 레벨 로직 추가 가능
 */
const SettingsPage: React.FC = () => {
  return <Settings />;
};

export default SettingsPage;
