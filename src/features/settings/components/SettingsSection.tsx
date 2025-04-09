import React from "react";
import { SettingSectionProps } from "../types";

/**
 * 설정 섹션 레이아웃 컴포넌트
 */
const SettingsSection: React.FC<SettingSectionProps> = ({
  title,
  children,
}) => {
  return (
    <div className="mb-4">
      <h3 className="text-white text-base mb-4">{title}</h3>
      {children}
    </div>
  );
};

export default SettingsSection;
