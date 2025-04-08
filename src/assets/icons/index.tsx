import React from "react";

interface IconProps {
  className?: string;
}

export const IconWorkspace: React.FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    width="24"
    height="24"
  >
    <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-3.31 0-6 2.69-6 6v8c0 3.31 2.69 6 6 6s6-2.69 6-6v-8c0-3.31-2.69-6-6-6zm0 2c2.21 0 4 1.79 4 4v8c0 2.21-1.79 4-4 4s-4-1.79-4-4v-8c0-2.21 1.79-4 4-4z" />
  </svg>
);

export const IconCalendar: React.FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    width="24"
    height="24"
  >
    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z" />
  </svg>
);

export const IconSettings: React.FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    width="24"
    height="24"
  >
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </svg>
);

// 필요에 따라 아이콘 크기, 색상 등을 커스텀할 수 있는 공통 컴포넌트
export const Icon: React.FC<{
  type: "workspace" | "calendar" | "settings";
  className?: string;
}> = ({ type, className }) => {
  switch (type) {
    case "workspace":
      return <IconWorkspace className={className} />;
    case "calendar":
      return <IconCalendar className={className} />;
    case "settings":
      return <IconSettings className={className} />;
    default:
      return null;
  }
};
