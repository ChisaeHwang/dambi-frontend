import React from "react";
import { SettingOptionProps } from "../types";

/**
 * 설정 옵션 컴포넌트
 */
const SettingOption: React.FC<SettingOptionProps> = ({
  label,
  description,
  children,
}) => {
  return (
    <div className="mb-4">
      <div className="flex flex-col mb-2">
        <label className="font-medium text-[var(--text-normal)] mb-1">
          {label}
        </label>
        {description && (
          <p className="text-sm text-[var(--text-muted)] mb-2">{description}</p>
        )}
      </div>
      <div className="w-full">{children}</div>
    </div>
  );
};

export default SettingOption;
