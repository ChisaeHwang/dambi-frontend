import React from "react";
import { Icon } from "../assets/icons";

// App.tsx와 동일한 Page 타입 사용
export type Page = "workspace" | "calendar" | "settings";

interface NavigationProps {
  currentPage: Page;
  onChangePage: (page: Page) => void;
}

const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onChangePage,
}) => {
  const navItems: { id: Page; title: string }[] = [
    { id: "workspace", title: "워크스페이스" },
    { id: "calendar", title: "작업 캘린더" },
    { id: "settings", title: "설정" },
  ];

  return (
    <div className="w-[72px] py-3 flex flex-col items-center bg-[var(--bg-tertiary)] shadow-sm">
      {navItems.map((item) => (
        <div
          key={item.id}
          className={`icon-button ${currentPage === item.id ? "active" : ""}`}
          onClick={() => onChangePage(item.id)}
          title={item.title}
        >
          {currentPage === item.id && (
            <div className="absolute left-[-16px] w-2 h-8 bg-white rounded-r"></div>
          )}
          <div className="w-6 h-6 flex items-center justify-center">
            <Icon type={item.id} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Navigation;
