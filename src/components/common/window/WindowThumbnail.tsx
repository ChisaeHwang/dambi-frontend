import React, { useState } from "react";
import type { WindowInfo } from "../../../hooks/useTimelapseGenerationCapture";
import AppIcon from "./AppIcon";

interface WindowThumbnailProps {
  window: WindowInfo;
}

const WindowThumbnail: React.FC<WindowThumbnailProps> = ({ window }) => {
  const [imageError, setImageError] = useState(false);

  // 썸네일 이미지 에러 처리
  const handleImageError = () => {
    setImageError(true);
  };

  // 썸네일이 없거나 로드 실패 시 앱 아이콘 표시
  if (!window.thumbnail || imageError) {
    return <AppIcon name={window.name} />;
  }

  // 썸네일 있는 경우 이미지 표시
  try {
    const dataUrl = window.thumbnail.toDataURL();

    return (
      <img
        src={dataUrl}
        alt={window.name}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        onError={handleImageError}
      />
    );
  } catch (error) {
    // 예외 발생 시 앱 아이콘으로 폴백
    return <AppIcon name={window.name} />;
  }
};

export default WindowThumbnail;
