import React, { useState, useEffect } from "react";
import type { WindowInfo } from "../../../hooks/useTimelapseGenerationCapture";
import {
  saveThumbnail,
  loadThumbnail,
  removeThumbnail,
} from "../../../utils/localStorage";

interface WindowThumbnailProps {
  window: WindowInfo;
}

// 로컬 스토리지 키 접두사
const THUMBNAIL_STORAGE_PREFIX = "window_thumbnail_";

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

      // 로컬 스토리지에 저장 (다른 페이지로 이동해도 유지되도록)
      saveThumbnail(window.id, window.thumbnailDataUrl);
      return;
    }

    // 2. 로컬 스토리지에서 확인
    const storedThumbnail = loadThumbnail(window.id);
    if (storedThumbnail) {
      console.log(`로컬 스토리지에서 썸네일 불러옴 (${window.name})`);
      setImageSrc(storedThumbnail);
      return;
    }

    // 3. 이전 방식 지원 (NativeImage 객체에서 변환)
    if (window.thumbnail) {
      try {
        console.log(`NativeImage에서 썸네일 변환 (${window.name})`);
        const dataUrl = window.thumbnail.toDataURL();
        setImageSrc(dataUrl);

        // 로컬 스토리지에 저장 (다른 페이지로 이동해도 유지되도록)
        saveThumbnail(window.id, dataUrl);
      } catch (error) {
        console.error("NativeImage 썸네일 처리 오류:", error);
        // 오류 메시지 표시하지 않고 window.name 사용
      }
      return;
    }

    // 4. 썸네일이 없는 경우 - 오류 메시지 표시하지 않음
    console.log(`${window.name}의 썸네일이 없습니다.`);
  }, [window, window.thumbnailDataUrl, window.timestamp]);

  // 이미지가 없으면 창 이름 표시
  if (!imageSrc) {
    return (
      <div className="w-full h-full bg-[var(--bg-secondary)] flex justify-center items-center overflow-hidden">
        <div className="text-white text-sm text-center p-2.5">
          {window.name}
        </div>
      </div>
    );
  }

  // 이미지가 있으면 이미지 표시
  return (
    <div className="w-full h-full bg-[var(--bg-secondary)] flex justify-center items-center overflow-hidden">
      <img
        key={`img-${window.id}-${window.timestamp || Date.now()}`}
        src={imageSrc}
        alt={window.name}
        className="w-full h-full object-contain"
        onError={(e) => {
          console.error(`이미지 로드 실패 (${window.name}):`, e);
          setImageSrc(null);
          // 이미지 로드 실패 메시지 표시하지 않음

          // 로컬 스토리지에서 삭제 (문제가 있는 썸네일)
          removeThumbnail(window.id);
        }}
      />
    </div>
  );
};

export default WindowThumbnail;
