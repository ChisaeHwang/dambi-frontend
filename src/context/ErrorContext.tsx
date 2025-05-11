import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
} from "react";

// 에러 타입 정의
export type AppError = {
  id: string;
  message: string;
  code?: string;
  stack?: string;
  timestamp: number;
  handled: boolean;
  source?: string;
  context?: Record<string, any>;
};

// 에러 컨텍스트 타입 정의
interface ErrorContextType {
  errors: AppError[];
  lastError: AppError | null;
  addError: (
    error: Error | string,
    options?: {
      code?: string;
      source?: string;
      context?: Record<string, any>;
    }
  ) => void;
  clearError: (id: string) => void;
  clearAllErrors: () => void;
  setErrorHandled: (id: string) => void;
}

// 기본값으로 ErrorContext 생성
export const ErrorContext = createContext<ErrorContextType>({
  errors: [],
  lastError: null,
  addError: () => {},
  clearError: () => {},
  clearAllErrors: () => {},
  setErrorHandled: () => {},
});

// ErrorContext Provider 컴포넌트
interface ErrorContextProviderProps {
  children: ReactNode;
}

// 유니크 ID 생성 함수
const generateId = () =>
  `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const ErrorContextProvider: React.FC<ErrorContextProviderProps> = ({
  children,
}) => {
  const [errors, setErrors] = useState<AppError[]>([]);

  // 에러 추가
  const addError = useCallback(
    (
      error: Error | string,
      options?: {
        code?: string;
        source?: string;
        context?: Record<string, any>;
      }
    ) => {
      const newError: AppError = {
        id: generateId(),
        message: typeof error === "string" ? error : error.message,
        code: options?.code,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: Date.now(),
        handled: false,
        source: options?.source,
        context: options?.context,
      };

      setErrors((prev) => [...prev, newError]);

      // 개발 환경에서는 콘솔에도 로깅
      if (process.env.NODE_ENV === "development") {
        console.error(
          `[ErrorContext] ${newError.source || "App"}: ${newError.message}`,
          newError
        );
      }

      return newError.id;
    },
    []
  );

  // 특정 에러 삭제
  const clearError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((error) => error.id !== id));
  }, []);

  // 모든 에러 삭제
  const clearAllErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // 에러를 처리됨으로 표시
  const setErrorHandled = useCallback((id: string) => {
    setErrors((prev) =>
      prev.map((error) =>
        error.id === id ? { ...error, handled: true } : error
      )
    );
  }, []);

  // 가장 최근 에러 계산
  const lastError = errors.length > 0 ? errors[errors.length - 1] : null;

  return (
    <ErrorContext.Provider
      value={{
        errors,
        lastError,
        addError,
        clearError,
        clearAllErrors,
        setErrorHandled,
      }}
    >
      {children}
    </ErrorContext.Provider>
  );
};

// 편의를 위한 커스텀 훅
export const useErrorContext = () => useContext(ErrorContext);

// 전역 에러 핸들러 훅
export const useGlobalErrorHandler = () => {
  const { addError } = useErrorContext();

  // 전역 오류 처리기 설정
  React.useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      addError(event.error || event.message, {
        source: "전역 에러 핸들러",
        context: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });

      // 기본 에러 처리 방지
      event.preventDefault();
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      addError(event.reason || "Promise 거부됨", {
        source: "처리되지 않은 Promise 거부",
        context: {
          reason: String(event.reason),
        },
      });

      // 기본 처리 방지
      event.preventDefault();
    };

    // 전역 이벤트 리스너 등록
    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      // 컴포넌트 언마운트 시 리스너 제거
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [addError]);

  return null;
};
