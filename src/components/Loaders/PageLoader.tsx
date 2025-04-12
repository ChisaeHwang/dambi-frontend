import React from "react";

/**
 * 페이지 로딩 컴포넌트
 */
const PageLoader: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-full w-full bg-[var(--bg-primary)]">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[var(--primary-color)]"></div>
    </div>
  );
};

export default PageLoader;
