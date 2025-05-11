import React, { useEffect, useState, useCallback } from "react";
import { useErrorContext, AppError } from "../context/ErrorContext";

const ErrorToast: React.FC = () => {
  const { errors, clearError, setErrorHandled } = useErrorContext();
  const [visibleErrors, setVisibleErrors] = useState<AppError[]>([]);

  // 토스트 닫기 (useCallback으로 래핑하여 메모이제이션)
  const handleClose = useCallback(
    (id: string) => {
      setVisibleErrors((prev) => prev.filter((err) => err.id !== id));
      clearError(id);
    },
    [clearError]
  );

  // 새 에러가 추가되면 표시
  useEffect(() => {
    // 아직 처리되지 않은 에러만 가져옴
    const unhandledErrors = errors.filter((err) => !err.handled);
    if (unhandledErrors.length > 0) {
      setVisibleErrors((prev) => [
        ...prev,
        ...unhandledErrors.filter((e) => !prev.some((pe) => pe.id === e.id)),
      ]);

      // 에러를 처리됨으로 표시
      unhandledErrors.forEach((error) => {
        setErrorHandled(error.id);
      });
    }
  }, [errors, setErrorHandled]);

  // 일정 시간 후 자동으로 닫기
  useEffect(() => {
    if (visibleErrors.length > 0) {
      const timers = visibleErrors.map((error) => {
        return setTimeout(() => {
          handleClose(error.id);
        }, 5000); // 5초 후 자동으로 닫힘
      });

      return () => {
        timers.forEach((timer) => clearTimeout(timer));
      };
    }
  }, [visibleErrors, handleClose]);

  if (visibleErrors.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
      {visibleErrors.map((error) => (
        <div
          key={error.id}
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-md max-w-md animate-fade-in"
          role="alert"
        >
          <div className="flex items-start">
            <div className="flex-1">
              <p className="font-bold">{error.source || "오류 발생"}</p>
              <p className="text-sm">{error.message}</p>
              {error.code && <p className="text-xs mt-1">코드: {error.code}</p>}
            </div>
            <button
              onClick={() => handleClose(error.id)}
              className="text-red-500 hover:text-red-700 ml-2"
              aria-label="닫기"
            >
              <span className="text-xl">&times;</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ErrorToast;
