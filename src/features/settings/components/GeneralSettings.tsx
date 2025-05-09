import React from "react";
import { AppSettings } from "../../calendar/types";
import SettingOption from "./SettingOption";

interface GeneralSettingsProps {
  settings: AppSettings;
  onChangeSettings: (settings: Partial<AppSettings>) => void;
}

/**
 * 일반 설정 컴포넌트
 */
const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  settings,
  onChangeSettings,
}) => {
  // 타임존 목록 - 주요 타임존만 포함
  const timezones = [
    "Asia/Seoul",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Singapore",
    "Australia/Sydney",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "America/New_York",
    "America/Los_Angeles",
    "America/Chicago",
    "Pacific/Auckland",
    "UTC",
  ];

  // 리셋 시간 목록 (0-23)
  const resetHours = Array.from({ length: 24 }, (_, i) => i);

  // 타임존 변경 핸들러
  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeSettings({ timezone: e.target.value });
  };

  // 리셋 시간 변경 핸들러
  const handleResetHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeSettings({ resetHour: parseInt(e.target.value, 10) });
  };

  return (
    <div className="space-y-4">
      <SettingOption
        label="타임존"
        description="작업 일자 계산에 사용될 타임존을 선택하세요."
      >
        <select
          value={settings.timezone}
          onChange={handleTimezoneChange}
          className="py-2 px-3 rounded bg-[var(--bg-primary)] text-[var(--text-normal)] border border-[var(--border-color)] w-full"
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </SettingOption>

      <SettingOption
        label="일일 리셋 시간"
        description="세션이 자동으로 종료되고 새로운 날로 간주될 시간을 설정하세요."
      >
        <select
          value={settings.resetHour}
          onChange={handleResetHourChange}
          className="py-2 px-3 rounded bg-[var(--bg-primary)] text-[var(--text-normal)] border border-[var(--border-color)] w-full"
        >
          {resetHours.map((hour) => (
            <option key={hour} value={hour}>
              {hour.toString().padStart(2, "0")}:00
            </option>
          ))}
        </select>
      </SettingOption>
    </div>
  );
};

export default GeneralSettings;
