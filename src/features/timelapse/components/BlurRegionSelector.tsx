import React, { useState, useEffect, useRef } from "react";
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
  const [zoomLevel, setZoomLevel] = useState(1);

  // 캔버스 참조
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 선택된 창 정보 찾기
  const selectedWindow = activeWindows.find((win) => win.id === windowId);
  const thumbnailUrl = selectedWindow?.thumbnailDataUrl || "";

  // 이미지 로드 및 초기화
  useEffect(() => {
    if (!thumbnailUrl) return;

    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setImageSize({ width: img.width, height: img.height });

      // 초기 영역 그리기
      if (canvasRef.current && regions.length > 0) {
        drawRegions();
      }
    };
    img.src = thumbnailUrl;
  }, [thumbnailUrl]);

  // regions 변경시 부모 컴포넌트에 알림
  useEffect(() => {
    onRegionsChange(regions);
  }, [regions, onRegionsChange]);

  // 영역 그리기 함수
  const drawRegions = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 이미지 그리기
    if (thumbnailUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 블러 영역 그리기
        regions.forEach((region, index) => {
          const isSelected = region.id === selectedRegionId;

          // 스케일 적용
          const scaledX = region.x * (canvas.width / imageSize.width);
          const scaledY = region.y * (canvas.height / imageSize.height);
          const scaledWidth = region.width * (canvas.width / imageSize.width);
          const scaledHeight =
            region.height * (canvas.height / imageSize.height);

          // 선택된 영역은 다른 색상으로 표시
          ctx.strokeStyle = isSelected
            ? "rgba(255, 0, 0, 0.8)"
            : "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";

          // 영역 채우기 및 테두리 그리기
          ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
          ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

          // 영역 번호 표시
          ctx.fillStyle = "white";
          ctx.font = "12px Arial";
          ctx.fillText(`${index + 1}`, scaledX + 5, scaledY + 15);
        });
      };
      img.src = thumbnailUrl;
    }
  };

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
    if (!isDrawing || !canvasRef.current || !currentRegion) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor(
      (e.clientX - rect.left) * (imageSize.width / canvasRef.current.width)
    );
    const y = Math.floor(
      (e.clientY - rect.top) * (imageSize.height / canvasRef.current.height)
    );

    // 영역 크기 업데이트
    const width = Math.max(0, x - startPoint.x);
    const height = Math.max(0, y - startPoint.y);

    setCurrentRegion({
      ...currentRegion,
      width,
      height,
    });

    // 미리보기 그리기
    drawRegions();

    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      // 현재 그리는 영역 미리보기
      const scaledX =
        startPoint.x * (canvasRef.current.width / imageSize.width);
      const scaledY =
        startPoint.y * (canvasRef.current.height / imageSize.height);
      const scaledWidth = width * (canvasRef.current.width / imageSize.width);
      const scaledHeight =
        height * (canvasRef.current.height / imageSize.height);

      ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
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

  // 영역 삭제
  const handleDeleteRegion = () => {
    if (selectedRegionId) {
      const updatedRegions = regions.filter((r) => r.id !== selectedRegionId);
      setRegions(updatedRegions);
      setSelectedRegionId(null);
    }
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

  // 확대/축소 처리
  const handleZoomChange = (newZoom: number) => {
    setZoomLevel(newZoom);
  };

  // 캔버스 크기 업데이트
  useEffect(() => {
    drawRegions();
  }, [zoomLevel, imageLoaded, regions, selectedRegionId]);

  // 캔버스 크기 설정
  const canvasWidth = Math.floor(imageSize.width * zoomLevel);
  const canvasHeight = Math.floor(imageSize.height * zoomLevel);

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
            onClick={handleDeleteRegion}
            disabled={!selectedRegionId}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="선택한 영역 삭제"
          >
            선택 영역 삭제
          </button>
          <button
            onClick={handleClearAllRegions}
            disabled={regions.length === 0}
            className="px-3 py-1.5 bg-gray-600 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="모든 영역 삭제"
          >
            전체 삭제
          </button>
        </div>
      </div>

      <div className="flex justify-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => handleZoomChange(0.5)}
            className={`px-3 py-1 rounded ${
              zoomLevel === 0.5
                ? "bg-blue-500 text-white"
                : "bg-gray-600 text-white"
            }`}
          >
            50%
          </button>
          <button
            onClick={() => handleZoomChange(1)}
            className={`px-3 py-1 rounded ${
              zoomLevel === 1
                ? "bg-blue-500 text-white"
                : "bg-gray-600 text-white"
            }`}
          >
            100%
          </button>
          <button
            onClick={() => handleZoomChange(1.5)}
            className={`px-3 py-1 rounded ${
              zoomLevel === 1.5
                ? "bg-blue-500 text-white"
                : "bg-gray-600 text-white"
            }`}
          >
            150%
          </button>
        </div>
      </div>

      <div
        className="overflow-auto border border-[var(--border-color)] rounded-lg"
        ref={containerRef}
        style={{ maxHeight: "500px" }}
      >
        {thumbnailUrl ? (
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
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
