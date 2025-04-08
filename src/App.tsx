import React, { useState, lazy, Suspense } from "react";
import AppTitleBar from "./components/layout/AppTitleBar";
import Navigation from "./components/layout/Navigation";
import { Page } from "./types/navigation";
import { isElectronEnv } from "./types/common";

// 지연 로딩으로 각 페이지 컴포넌트 불러오기
const TimelapseWorkspacePage = lazy(
  () => import("./pages/TimelapseWorkspacePage")
);
const Calendar = lazy(() => import("./components/Calendar"));
const Settings = lazy(() => import("./components/Settings"));

// 로딩 중 표시할 컴포넌트
const PageLoader = () => (
  <div className="flex justify-center items-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
  </div>
);

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("workspace");

  // 일렉트론 환경에서 실행 중인지 확인
  const isElectron = isElectronEnv();

  // 페이지 전환 핸들러
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
            {currentPage === "settings" && <Settings />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;
