import React, { createContext, useState, ReactNode } from "react";
import { Page } from "../types/navigation";

// AppContext 타입 정의
interface AppContextType {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

// 기본값으로 AppContext 생성
export const AppContext = createContext<AppContextType>({
  currentPage: "calendar",
  setCurrentPage: () => {},
});

// AppContext Provider 컴포넌트
interface AppContextProviderProps {
  children: ReactNode;
  initialPage?: Page;
}

export const AppContextProvider = ({
  children,
  initialPage = "calendar",
}: AppContextProviderProps) => {
  const [currentPage, setCurrentPage] = useState<Page>(initialPage);

  return (
    <AppContext.Provider value={{ currentPage, setCurrentPage }}>
      {children}
    </AppContext.Provider>
  );
};
