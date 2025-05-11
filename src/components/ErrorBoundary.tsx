import React, { Component, ErrorInfo, ReactNode } from "react";
import { useErrorContext } from "../context/ErrorContext";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 에러 경계 컴포넌트
 * React 컴포넌트 트리의 어디서든 발생하는 자바스크립트 오류를 기록하고
 * 대체 UI를 표시하는 컴포넌트
 */
class ErrorBoundaryBase extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 다음 렌더링에서 대체 UI를 표시하도록 상태 업데이트
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 에러 정보 로깅
    console.error(
      `[ErrorBoundary ${this.props.name || ""}] 컴포넌트 에러 발생:`,
      error,
      errorInfo
    );

    // 부모 컴포넌트에 에러 전달
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // 사용자 정의 fallback이 있으면 사용, 아니면 기본 에러 UI
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-100 border border-red-300 rounded-md">
            <h3 className="text-lg font-medium text-red-800 mb-2">
              오류가 발생했습니다
            </h3>
            <p className="text-sm text-red-700">
              {this.state.error?.message || "알 수 없는 오류가 발생했습니다."}
            </p>
            <button
              className="mt-3 px-4 py-2 bg-red-700 text-white rounded text-sm hover:bg-red-800"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              다시 시도
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * ErrorContext를 ErrorBoundary와 통합하기 위한 래퍼 컴포넌트
 */
const ErrorBoundary: React.FC<ErrorBoundaryProps> = (props) => {
  const { addError } = useErrorContext();

  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // ErrorContext에 에러 추가
    addError(error, {
      source: `ErrorBoundary${props.name ? ` - ${props.name}` : ""}`,
      context: {
        componentStack: errorInfo.componentStack,
      },
    });

    // 사용자 정의 onError 핸들러 호출
    if (props.onError) {
      props.onError(error, errorInfo);
    }
  };

  return <ErrorBoundaryBase {...props} onError={handleError} />;
};

export default ErrorBoundary;
