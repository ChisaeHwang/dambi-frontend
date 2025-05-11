import React, { useState, useEffect, useRef, useCallback } from "react";
import { WindowInfo } from "../../../features/window/types";
import { BlurRegion } from "../types";

interface BlurRegionSelectorProps {
  windowId: string;
  activeWindows: WindowInfo[];
  blurRegions: BlurRegion[];
  onChange: (regions: BlurRegion[]) => void;
}

const BlurRegionSelector: React.FC<BlurRegionSelectorProps> = ({
  windowId,
  activeWindows,
  blurRegions,
  onChange,
}) => {
  // 상태 관리
  const [regions, setRegions] = useState<BlurRegion[]>(blurRegions || []);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [currentRegion, setCurrentRegion] = useState<BlurRegion | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [hoveredDeleteButton, setHoveredDeleteButton] = useState<string | null>(
    null
  );
  const [scale, setScale] = useState(1);

  // 이미지 캐싱
  const [cachedImage, setCachedImage] = useState<HTMLImageElement | null>(null);

  // 캔버스 참조
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 선택된 창 정보 찾기
  const selectedWindow = activeWindows.find((win) => win.id === windowId);
  const thumbnailUrl = selectedWindow?.thumbnailDataUrl || "";

  // 영역 그리기 함수 (useCallback으로 감싸서 의존성 문제 해결)
  const drawRegions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded || !cachedImage) return;

    const ctx = canvas.getContext("2d", {
      alpha: false,
      willReadFrequently: true,
    });
    if (!ctx) return;

    // 이미지 스무딩 비활성화 (선명한 이미지)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 이미지 그리기 (캐싱된 이미지 사용)
    ctx.drawImage(cachedImage, 0, 0, canvas.width, canvas.height);

    // 비율 계산 (이미지 좌표 <-> 캔버스 좌표 변환용)
    const scaleFactorX = imageSize.width / canvas.width;
    const scaleFactorY = imageSize.height / canvas.height;

    // 디버깅용 로그 제거 (성능 향상)

    // 블러 영역 그리기
    regions.forEach((region, index) => {
      const isSelected = region.id === selectedRegionId;

      // 스케일 적용 (이미지 좌표 -> 캔버스 좌표)
      const scaledX = region.x / scaleFactorX;
      const scaledY = region.y / scaleFactorY;
      const scaledWidth = region.width / scaleFactorX;
      const scaledHeight = region.height / scaleFactorY;

      // 선택된 영역은 다른 색상으로 표시
      ctx.strokeStyle = isSelected
        ? "rgba(255, 0, 0, 0.9)"
        : "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = isSelected ? 3 : 2;

      // 영역 채우기 - 더 뚜렷한 효과를 위해 투명도 조정
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";

      // 외곽선 그림자 효과 추가
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      // 영역 채우기 및 테두리 그리기
      ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // 그림자 초기화 (영역 번호에는 적용 안함)
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // 영역 번호 표시 - 더 선명하게
      ctx.fillStyle = "white";
      ctx.font = "bold 14px Arial";

      // 텍스트에 검은색 외곽선 효과 추가
      ctx.strokeStyle = "black";
      ctx.lineWidth = 3;
      ctx.strokeText(`${index + 1}`, scaledX + 8, scaledY + 20);

      // 텍스트 내용
      ctx.fillText(`${index + 1}`, scaledX + 8, scaledY + 20);

      // X 버튼 그리기 (더 크고 예쁜 디자인)
      const btnSize = 32; // 크기 키움 (22 -> 32)
      const btnX = scaledX + scaledWidth - btnSize - 6;
      const btnY = scaledY + 6;

      // X 버튼 배경 - 호버 효과 적용
      const isHovered = region.id === hoveredDeleteButton;

      // 그림자 효과 (hover시 강조)
      if (isHovered) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
      }

      // 원형 배경 - 색상 및 디자인 개선
      ctx.beginPath();
      ctx.arc(
        btnX + btnSize / 2,
        btnY + btnSize / 2,
        btnSize / 2,
        0,
        Math.PI * 2
      );

      // 그라데이션 배경 생성
      const gradient = ctx.createRadialGradient(
        btnX + btnSize / 2,
        btnY + btnSize / 2,
        btnSize / 8,
        btnX + btnSize / 2,
        btnY + btnSize / 2,
        btnSize / 2
      );

      if (isHovered) {
        gradient.addColorStop(0, "rgba(255, 80, 80, 1)");
        gradient.addColorStop(1, "rgba(220, 40, 40, 1)");
      } else {
        gradient.addColorStop(0, "rgba(255, 80, 80, 0.95)");
        gradient.addColorStop(1, "rgba(220, 50, 50, 0.85)");
      }

      ctx.fillStyle = gradient;
      ctx.fill();

      // 테두리 추가 (좀 더 밝은 테두리)
      ctx.strokeStyle = "rgba(255, 200, 200, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // X 표시 (더 굵고 세련되게)
      ctx.strokeStyle = "white";
      ctx.lineWidth = isHovered ? 3.5 : 3; // 선 두께 증가
      ctx.lineCap = "round"; // 선 끝 부분을 둥글게

      // 중심에서 시작하는 X 표시
      const centerX = btnX + btnSize / 2;
      const centerY = btnY + btnSize / 2;
      const offset = btnSize / 3.5;

      ctx.beginPath();
      ctx.moveTo(centerX - offset, centerY - offset);
      ctx.lineTo(centerX + offset, centerY + offset);
      ctx.moveTo(centerX + offset, centerY - offset);
      ctx.lineTo(centerX - offset, centerY + offset);
      ctx.stroke();

      // 그림자 초기화
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.lineCap = "butt"; // 기본값으로 리셋
    });

    // 현재 그리는 영역 미리보기
    if (isDrawing && currentRegion) {
      const scaledX = currentRegion.x / scaleFactorX;
      const scaledY = currentRegion.y / scaleFactorY;
      const scaledWidth = currentRegion.width / scaleFactorX;
      const scaledHeight = currentRegion.height / scaleFactorY;

      // 그리는 중인 영역 강조 효과
      ctx.strokeStyle = "rgba(255, 60, 60, 0.9)";
      ctx.lineWidth = 2;

      // 약간의 그림자 효과
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 4;

      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // 그림자 초기화
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }
  }, [
    regions,
    imageLoaded,
    cachedImage,
    imageSize,
    currentRegion,
    isDrawing,
    selectedRegionId,
    hoveredDeleteButton,
  ]);

  // 컨테이너 크기 조정 및 스케일 계산
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current || !imageSize.width || !imageSize.height)
        return;

      // 컨테이너 크기에서 패딩 고려 (가능한 최대 너비 사용)
      const containerWidth = containerRef.current.clientWidth - 20; // 패딩 고려

      // 사용 가능한 최대 높이 계산 (전체 화면 높이에서 다른 UI 요소 높이 제외)
      const availableHeight = window.innerHeight - 260;

      // 이미지 비율 계산
      const imgRatio = imageSize.width / imageSize.height;

      // 이미지 높이 우선 계산 (가로 꽉 채우기)
      let newWidth = containerWidth;
      let newHeight = newWidth / imgRatio;

      // 만약 높이가 사용 가능한 높이보다 크면 높이 기준으로 다시 계산
      if (newHeight > availableHeight) {
        newHeight = availableHeight;
        newWidth = newHeight * imgRatio;
      }

      // 스케일 값 계산 (이미지 원본 크기 대비)
      const widthScale = newWidth / imageSize.width;
      const heightScale = newHeight / imageSize.height;

      // 동일한 스케일 적용
      setScale(Math.min(widthScale, heightScale));
    };

    // 초기 스케일 계산
    updateScale();

    // 이벤트 핸들러 등록 - 스로틀링 적용
    let resizeTimeout: NodeJS.Timeout | null = null;
    const handleResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
        resizeTimeout = null;
      }
      resizeTimeout = setTimeout(() => {
        updateScale();
        resizeTimeout = null;
      }, 200); // 200ms 지연
    };

    // 이벤트 리스너 등록
    window.addEventListener("resize", handleResize);

    // 정리 함수
    return () => {
      // 이벤트 리스너 제거
      window.removeEventListener("resize", handleResize);
      // 대기 중인 타이머 정리
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
        resizeTimeout = null;
      }
    };
  }, [imageSize]);

  // 이미지 로드 및 초기화
  useEffect(() => {
    if (!thumbnailUrl) return;

    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setImageSize({ width: img.width, height: img.height });
      setCachedImage(img);

      // 초기 영역 그리기
      if (canvasRef.current && regions.length > 0) {
        drawRegions();
      }
    };
    img.src = thumbnailUrl;
  }, [thumbnailUrl, regions.length, drawRegions]);

  // regions 변경시 부모 컴포넌트에 알림
  useEffect(() => {
    onChange(regions);
  }, [regions, onChange]);

  // 마우스 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // 캔버스의 CSS 크기와 실제 크기 사이의 비율 계산
    const cssScaleX = canvas.width / rect.width;
    const cssScaleY = canvas.height / rect.height;

    // 마우스 위치를 캔버스 좌표로 변환 (CSS 픽셀 -> 캔버스 픽셀)
    const canvasX = (e.clientX - rect.left) * cssScaleX;
    const canvasY = (e.clientY - rect.top) * cssScaleY;

    // 비율 계산 (이미지 좌표 <-> 캔버스 좌표 변환용)
    const scaleFactorX = imageSize.width / canvas.width;
    const scaleFactorY = imageSize.height / canvas.height;

    // 캔버스 좌표를 이미지 좌표로 변환
    const x = Math.floor(canvasX * scaleFactorX);
    const y = Math.floor(canvasY * scaleFactorY);

    // X 버튼 클릭 확인
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];

      // 이미지 좌표를 캔버스 좌표로 변환
      const scaledX = region.x / scaleFactorX;
      const scaledY = region.y / scaleFactorY;
      const scaledWidth = region.width / scaleFactorX;

      const btnSize = 32; // X 버튼 크기 (키움)
      const btnX = scaledX + scaledWidth - btnSize - 6;
      const btnY = scaledY + 6;

      // 버튼 중심 좌표
      const btnCenterX = btnX + btnSize / 2;
      const btnCenterY = btnY + btnSize / 2;

      // 클릭 지점과 버튼 중심 사이의 거리 계산
      const distance = Math.sqrt(
        Math.pow(canvasX - btnCenterX, 2) + Math.pow(canvasY - btnCenterY, 2)
      );

      // 버튼 반경 내에 클릭했는지 확인
      if (distance <= btnSize / 2) {
        // X 버튼 클릭 - 영역 삭제
        const updatedRegions = regions.filter((r) => r.id !== region.id);
        setRegions(updatedRegions);
        return;
      }
    }

    // 기존 영역 선택 확인
    const clickedRegion = regions.find((region) => {
      return (
        x >= region.x &&
        x <= region.x + region.width &&
        y >= region.y &&
        y <= region.y + region.height
      );
    });

    if (clickedRegion) {
      // 기존 영역 선택
      setSelectedRegionId(clickedRegion.id);
    } else {
      // 새 영역 그리기 시작
      setIsDrawing(true);
      setStartPoint({ x, y });
      setSelectedRegionId(null);

      // 새 영역 초기화
      const newRegion: BlurRegion = {
        id: `region-${Date.now()}`,
        x,
        y,
        width: 0,
        height: 0,
      };
      setCurrentRegion(newRegion);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !imageLoaded) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // 캔버스의 CSS 크기와 실제 크기 사이의 비율 계산
    const cssScaleX = canvas.width / rect.width;
    const cssScaleY = canvas.height / rect.height;

    // 마우스 위치를 캔버스 좌표로 변환 (CSS 픽셀 -> 캔버스 픽셀)
    const canvasX = (e.clientX - rect.left) * cssScaleX;
    const canvasY = (e.clientY - rect.top) * cssScaleY;

    // 비율 계산 (이미지 좌표 <-> 캔버스 좌표 변환용)
    const scaleFactorX = imageSize.width / canvas.width;
    const scaleFactorY = imageSize.height / canvas.height;

    // 캔버스 좌표를 이미지 좌표로 변환
    const imageX = Math.floor(canvasX * scaleFactorX);
    const imageY = Math.floor(canvasY * scaleFactorY);

    // 삭제 버튼 호버 체크
    let foundHover = false;
    for (const region of regions) {
      // 이미지 좌표를 캔버스 좌표로 변환
      const scaledX = region.x / scaleFactorX;
      const scaledY = region.y / scaleFactorY;
      const scaledWidth = region.width / scaleFactorX;

      const btnSize = 32; // X 버튼 크기 (키움)
      const btnX = scaledX + scaledWidth - btnSize - 6;
      const btnY = scaledY + 6;

      // 버튼 중심 좌표
      const btnCenterX = btnX + btnSize / 2;
      const btnCenterY = btnY + btnSize / 2;

      // 마우스 포인터와 버튼 중심 사이의 거리 계산
      const distance = Math.sqrt(
        Math.pow(canvasX - btnCenterX, 2) + Math.pow(canvasY - btnCenterY, 2)
      );

      if (distance <= btnSize / 2) {
        setHoveredDeleteButton(region.id);
        foundHover = true;
        canvas.style.cursor = "pointer";
        break;
      }
    }

    if (!foundHover) {
      setHoveredDeleteButton(null);
      // 드로잉 중이거나 일반 상태에서는 crosshair 커서 유지 (+ 모양)
      canvas.style.cursor = "crosshair";
    }

    // 드로잉 중 로직
    if (isDrawing && currentRegion) {
      // 영역 크기 업데이트 (정확한 비율 유지)
      const width = Math.max(0, imageX - startPoint.x);
      const height = Math.max(0, imageY - startPoint.y);

      setCurrentRegion({
        ...currentRegion,
        width,
        height,
      });

      // 미리보기 그리기
      drawRegions();
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRegion) return;

    // 최소 크기 검사
    if (currentRegion.width > 5 && currentRegion.height > 5) {
      // 새 영역 추가
      setRegions([...regions, currentRegion]);
    }

    // 초기화
    setIsDrawing(false);
    setCurrentRegion(null);
    drawRegions();
  };

  // 모든 영역 삭제
  const handleClearAllRegions = () => {
    if (regions.length > 0) {
      if (window.confirm("모든 블러 영역을 삭제하시겠습니까?")) {
        setRegions([]);
        setSelectedRegionId(null);
      }
    }
  };

  // 캔버스 크기 업데이트
  useEffect(() => {
    drawRegions();
  }, [
    imageLoaded,
    regions,
    selectedRegionId,
    hoveredDeleteButton,
    scale,
    drawRegions,
  ]);

  // 스케일에 맞춘 캔버스 크기 계산
  const scaledWidth = imageSize.width * scale;
  const scaledHeight = imageSize.height * scale;

  return (
    <div className="bg-[var(--bg-tertiary)] p-4 rounded-lg">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">블러 영역 설정</h3>
          <p className="text-sm text-[var(--text-muted)]">
            보호하려는 영역을 선택하면 타임랩스 생성 시 블러 처리됩니다
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleClearAllRegions}
            disabled={regions.length === 0}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
            title="모든 영역 삭제"
          >
            전체 삭제
          </button>
        </div>
      </div>

      <div
        className="overflow-hidden border border-[var(--border-color)] rounded-lg flex justify-center items-center bg-black"
        ref={containerRef}
        style={{ height: scaledHeight, width: "100%" }}
      >
        {thumbnailUrl ? (
          <canvas
            ref={canvasRef}
            width={imageSize.width}
            height={imageSize.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              handleMouseUp();
              setHoveredDeleteButton(null);
            }}
            style={{
              width: scaledWidth,
              height: scaledHeight,
              imageRendering: "auto", // 브라우저 기본 렌더링으로 변경 (pixelated 대신)
              WebkitFontSmoothing: "antialiased", // 텍스트 부드럽게
              backfaceVisibility: "hidden", // 렌더링 개선
            }}
            className="cursor-crosshair"
          ></canvas>
        ) : (
          <div className="flex items-center justify-center h-[300px] bg-[var(--bg-secondary)]">
            <p className="text-[var(--text-muted)]">이미지를 불러오는 중...</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-[var(--text-muted)]">
          {regions.length > 0 ? (
            <span>{regions.length}개의 블러 영역이 설정되었습니다.</span>
          ) : (
            <span>영역을 추가하려면 이미지를 클릭하고 드래그하세요.</span>
          )}
        </div>
        {selectedWindow && (
          <div className="text-xs text-[var(--text-muted)]">
            {selectedWindow.thumbnailWidth}x{selectedWindow.thumbnailHeight}{" "}
            캡처
          </div>
        )}
      </div>
    </div>
  );
};

export default BlurRegionSelector;
