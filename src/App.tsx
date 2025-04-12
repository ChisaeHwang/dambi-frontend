import React, { Suspense } from "react";
import { isElectronEnv } from "./types/common";
import Navigation from "./components/layout/Navigation";
import AppTitleBar from "./components/layout/AppTitleBar";
import PageLoader from "./components/Loaders/PageLoader";
import Calendar from "./features/calendar/components/Calendar";
import { AppContextProvider, AppContext } from "./context/AppContext";
import { Page } from "./types/navigation";

// 지연 로딩으로 각 페이지 컴포넌트 불러오기
const TimelapseWorkspacePage = React.lazy(
  () => import("./pages/TimelapseWorkspacePage")
);
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));

function App() {
  const isElectron = isElectronEnv();

  return (
    <AppContextProvider>
      <AppContent isElectron={isElectron} />
    </AppContextProvider>
  );
}

// 컨텍스트를 사용하는 앱 내용 컴포넌트
const AppContent: React.FC<{ isElectron: boolean }> = ({ isElectron }) => {
  // 컨텍스트에서 페이지 상태 가져오기
  const { currentPage, setCurrentPage } = React.useContext(AppContext);

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
};

export default App;
