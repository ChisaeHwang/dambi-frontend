import React, { Suspense, useState } from "react";
import { Page } from "./types/navigation";
import { isElectronEnv } from "./types/common";
import Navigation from "./components/layout/Navigation";
import AppTitleBar from "./components/layout/AppTitleBar";
import PageLoader from "./components/Loaders/PageLoader";
import Calendar from "./features/calendar/components/Calendar";

// 지연 로딩으로 각 페이지 컴포넌트 불러오기
const TimelapseWorkspacePage = React.lazy(
  () => import("./pages/TimelapseWorkspacePage")
);
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("calendar");
  const isElectron = isElectronEnv();

  const handlePageChange = (page: Page) => {
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-tertiary)] text-[var(--text-normal)]">
      {isElectron && <AppTitleBar />}
      <div className="flex flex-1 overflow-hidden">
        {/* 네비게이션 사이드바 */}
        <Navigation currentPage={currentPage} onChangePage={handlePageChange} />

        {/* 메인 컨텐츠 영역 - 조건부 렌더링 개선 */}
        <main className="flex-1 overflow-hidden bg-[var(--bg-primary)]">
          <Suspense fallback={<PageLoader />}>
            {currentPage === "workspace" && <TimelapseWorkspacePage />}
            {currentPage === "calendar" && <Calendar />}
            {currentPage === "settings" && <SettingsPage />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;
