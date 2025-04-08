import React, { useState, useEffect, useRef, useCallback } from "react";
import { WindowInfo } from "../../../features/window/types";
import { BlurRegion } from "../types";

interface BlurRegionSelectorProps {
  windowId: string;
  activeWindows: WindowInfo[];
  initialRegions: BlurRegion[];
  onRegionsChange: (regions: BlurRegion[]) => void;
}

const BlurRegionSelector: React.FC<BlurRegionSelectorProps> = ({
  windowId,
  activeWindows,
  initialRegions,
  onRegionsChange,
}) => {
  // 상태 관리
  const [regions, setRegions] = useState<BlurRegion[]>(initialRegions || []);
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

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 이미지 그리기 (캐싱된 이미지 사용)
    ctx.drawImage(cachedImage, 0, 0, canvas.width, canvas.height);

    // 블러 영역 그리기
    regions.forEach((region, index) => {
      const isSelected = region.id === selectedRegionId;

      // 스케일 적용
      const scaledX = region.x * (canvas.width / imageSize.width);
      const scaledY = region.y * (canvas.height / imageSize.height);
      const scaledWidth = region.width * (canvas.width / imageSize.width);
      const scaledHeight = region.height * (canvas.height / imageSize.height);

      // 선택된 영역은 다른 색상으로 표시
      ctx.strokeStyle = isSelected
        ? "rgba(255, 0, 0, 0.8)"
        : "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";

      // 영역 채우기 및 테두리 그리기
      ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // 영역 번호 표시
      ctx.fillStyle = "white";
      ctx.font = "14px Arial";
      ctx.fillText(`${index + 1}`, scaledX + 8, scaledY + 20);

      // X 버튼 그리기 (크기 증가 및 효과 개선)
      const btnSize = 28; // 크기 더 키움
      const btnX = scaledX + scaledWidth - btnSize - 4;
      const btnY = scaledY + 4;

      // X 버튼 배경 - 호버 효과 적용
      const isHovered = region.id === hoveredDeleteButton;
      ctx.fillStyle = isHovered
        ? "rgba(255, 0, 0, 1)"
        : "rgba(255, 0, 0, 0.85)";

      // 원형 배경
      ctx.beginPath();
      ctx.arc(
        btnX + btnSize / 2,
        btnY + btnSize / 2,
        btnSize / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // 그림자 효과
      if (isHovered) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 5;
      }

      // X 표시
      ctx.strokeStyle = "white";
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(btnX + 7, btnY + 7);
      ctx.lineTo(btnX + btnSize - 7, btnY + btnSize - 7);
      ctx.moveTo(btnX + btnSize - 7, btnY + 7);
      ctx.lineTo(btnX + 7, btnY + btnSize - 7);
      ctx.stroke();

      // 그림자 초기화
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    });

    // 현재 그리는 영역 미리보기
    if (isDrawing && currentRegion) {
      const scaledX = currentRegion.x * (canvas.width / imageSize.width);
      const scaledY = currentRegion.y * (canvas.height / imageSize.height);
      const scaledWidth =
        currentRegion.width * (canvas.width / imageSize.width);
      const scaledHeight =
        currentRegion.height * (canvas.height / imageSize.height);

      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
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

      // 컨테이너 크기에서 패딩 고려
      const containerWidth = containerRef.current.clientWidth - 20; // 패딩 고려
      const containerHeight = Math.min(window.innerHeight - 260, 800); // 최대 높이 증가

      // 이미지 비율 유지하면서 컨테이너에 맞추기
      const widthScale = containerWidth / imageSize.width;
      const heightScale = containerHeight / imageSize.height;

      // 스케일 값 적용 (기본값 0.9로 더 크게 표시)
      const newScale = Math.min(widthScale, heightScale, 1.1); // 최대 원본 크기보다 약간 더 크게

      setScale(newScale);
    };

    updateScale();
    window.addEventListener("resize", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
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
    onRegionsChange(regions);
  }, [regions, onRegionsChange]);

  // 마우스 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !imageLoaded) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor(
      (e.clientX - rect.left) * (imageSize.width / canvasRef.current.width)
    );
    const y = Math.floor(
      (e.clientY - rect.top) * (imageSize.height / canvasRef.current.height)
    );

    // X 버튼 클릭 확인
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      const scaledX = region.x * (canvasRef.current.width / imageSize.width);
      const scaledY = region.y * (canvasRef.current.height / imageSize.height);
      const scaledWidth =
        region.width * (canvasRef.current.width / imageSize.width);

      const btnSize = 28; // X 버튼 크기 키움
      const btnX = scaledX + scaledWidth - btnSize - 4;
      const btnY = scaledY + 4;

      // X 버튼 영역 확인
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const distance = Math.sqrt(
        Math.pow(clickX - (btnX + btnSize / 2), 2) +
          Math.pow(clickY - (btnY + btnSize / 2), 2)
      );

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

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 실제 이미지 좌표로 변환
    const imageX = Math.floor(
      mouseX * (imageSize.width / canvasRef.current.width)
    );
    const imageY = Math.floor(
      mouseY * (imageSize.height / canvasRef.current.height)
    );

    // 삭제 버튼 호버 체크
    let foundHover = false;
    for (const region of regions) {
      const scaledX = region.x * (canvasRef.current.width / imageSize.width);
      const scaledY = region.y * (canvasRef.current.height / imageSize.height);
      const scaledWidth =
        region.width * (canvasRef.current.width / imageSize.width);

      const btnSize = 28; // X 버튼 크기 키움
      const btnX = scaledX + scaledWidth - btnSize - 4;
      const btnY = scaledY + 4;

      const distance = Math.sqrt(
        Math.pow(mouseX - (btnX + btnSize / 2), 2) +
          Math.pow(mouseY - (btnY + btnSize / 2), 2)
      );

      if (distance <= btnSize / 2) {
        setHoveredDeleteButton(region.id);
        foundHover = true;
        canvasRef.current.style.cursor = "pointer";
        break;
      }
    }

    if (!foundHover) {
      setHoveredDeleteButton(null);
      // 드로잉 중이거나 일반 상태에서는 crosshair 커서 유지 (+ 모양)
      canvasRef.current.style.cursor = "crosshair";
    }

    // 드로잉 중 로직
    if (isDrawing && currentRegion) {
      // 영역 크기 업데이트
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
            className="px-3 py-1.5 bg-red-600 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700"
            title="모든 영역 삭제"
          >
            전체 삭제
          </button>
        </div>
      </div>

      <div
        className="overflow-hidden border border-[var(--border-color)] rounded-lg flex justify-center items-center bg-black"
        ref={containerRef}
        style={{ height: Math.min(scaledHeight + 10, 800), maxHeight: "800px" }}
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
            }}
            className="cursor-crosshair"
          ></canvas>
        ) : (
          <div className="flex items-center justify-center h-[300px] bg-[var(--bg-secondary)]">
            <p className="text-[var(--text-muted)]">이미지를 불러오는 중...</p>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-[var(--text-muted)]">
        {regions.length > 0 ? (
          <span>{regions.length}개의 블러 영역이 설정되었습니다.</span>
        ) : (
          <span>영역을 추가하려면 이미지를 클릭하고 드래그하세요.</span>
        )}
      </div>
    </div>
  );
};

export default BlurRegionSelector;
