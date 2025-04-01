import React, { useState, useEffect } from "react";
import type { WindowInfo } from "../../../hooks/useTimelapseGenerationCapture";

interface WindowThumbnailProps {
  window: WindowInfo;
}

const WindowThumbnail: React.FC<WindowThumbnailProps> = ({ window }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 썸네일 데이터가 변경될 때마다 업데이트
  useEffect(() => {
    // 상태 초기화
    setImageSrc(null);
    setErrorMsg(null);

    // 1. 먼저 직접 Base64로 인코딩된 데이터를 확인
    if (window.thumbnailDataUrl) {
      console.log(`직접 전달된 Base64 썸네일 사용 (${window.name})`);
      setImageSrc(window.thumbnailDataUrl);
      return;
    }

    // 2. 이전 방식 지원 (NativeImage 객체에서 변환)
    if (window.thumbnail) {
      try {
        console.log(`NativeImage에서 썸네일 변환 (${window.name})`);
        const dataUrl = window.thumbnail.toDataURL();
        setImageSrc(dataUrl);
      } catch (error) {
        console.error("NativeImage 썸네일 처리 오류:", error);
        setErrorMsg(
          `오류: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      return;
    }

    // 3. 썸네일이 없는 경우
    setErrorMsg("썸네일이 없습니다");
  }, [window, window.thumbnailDataUrl, window.timestamp]);

  // 이미지가 없으면 창 이름 또는 오류 표시
  if (!imageSrc) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#2f3136",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            color: errorMsg ? "#e74c3c" : "#fff",
            fontSize: "14px",
            textAlign: "center",
            padding: "10px",
          }}
        >
          {errorMsg || window.name}
        </div>
      </div>
    );
  }

  // 이미지가 있으면 이미지 표시
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#2f3136",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <img
        key={`img-${window.id}-${window.timestamp || Date.now()}`}
        src={imageSrc}
        alt={window.name}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
        onError={(e) => {
          console.error(`이미지 로드 실패 (${window.name}):`, e);
          setImageSrc(null);
          setErrorMsg("이미지 로드 실패");
        }}
      />
    </div>
  );
};

export default WindowThumbnail;
