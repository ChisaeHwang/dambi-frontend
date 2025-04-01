import React, { useState, useEffect } from "react";
import type { WindowInfo } from "../../../hooks/useTimelapseGenerationCapture";

interface WindowThumbnailProps {
  window: WindowInfo;
}

const WindowThumbnail: React.FC<WindowThumbnailProps> = ({ window }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<number>(Date.now());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // window prop이 변경될 때마다 썸네일 업데이트
  useEffect(() => {
    // 상태 초기화
    setTimestamp(Date.now());
    setImageSrc(null);
    setErrorMsg(null);

    if (!window.thumbnail) {
      setErrorMsg("썸네일이 없습니다");
      return;
    }

    try {
      // 그냥 데이터 URL 그대로 사용
      const dataUrl = window.thumbnail.toDataURL();

      // 데이터 URL 유효성 확인
      if (!dataUrl || dataUrl.length < 50) {
        setErrorMsg("썸네일 데이터가 유효하지 않습니다");
        console.error(
          `유효하지 않은 데이터 URL: ${dataUrl?.substring(0, 20)}...`
        );
        return;
      }

      console.log(
        `썸네일 로드 성공 (${window.name}): ${dataUrl.substring(0, 30)}...`
      );
      setImageSrc(dataUrl);
    } catch (error) {
      console.error("썸네일 처리 오류:", error);
      setErrorMsg(
        `오류: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }, [window]);

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

  // 이미지가 있으면 이미지 표시 (key 속성에 타임스탬프 추가)
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
        key={`img-${window.id}-${timestamp}`}
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
