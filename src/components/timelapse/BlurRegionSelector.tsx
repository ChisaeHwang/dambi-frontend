import React, { useState, useRef } from "react";

export interface BlurRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BlurRegionSelectorProps {
  thumbnailUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  regions: BlurRegion[];
  onRegionsChange: (regions: BlurRegion[]) => void;
  isEditable: boolean;
}

const BlurRegionSelector: React.FC<BlurRegionSelectorProps> = ({
  thumbnailUrl,
  thumbnailWidth,
  thumbnailHeight,
  regions,
  onRegionsChange,
  isEditable,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // 드래그 시작 처리
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditable) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 기존 영역 위에서 클릭했는지 확인
    const clickedRegion = regions.find(
      (region) =>
        x >= region.x &&
        x <= region.x + region.width &&
        y >= region.y &&
        y <= region.y + region.height
    );

    if (clickedRegion) {
      // 기존 영역 선택
      setSelectedRegionId(clickedRegion.id);
      setIsDragging(true);
    } else {
      // 새 영역 생성 시작
      setIsCreating(true);
      setStartPoint({ x, y });

      // 새 영역 ID 생성
      const newRegion: BlurRegion = {
        id: `region-${Date.now()}`,
        x,
        y,
        width: 0,
        height: 0,
      };

      onRegionsChange([...regions, newRegion]);
      setSelectedRegionId(newRegion.id);
    }
  };

  // 마우스 이동 처리
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isEditable || (!isDragging && !isCreating)) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.max(0, Math.min(e.clientX - rect.left, thumbnailWidth));
    const y = Math.max(0, Math.min(e.clientY - rect.top, thumbnailHeight));

    if (isCreating && selectedRegionId) {
      // 새 영역 크기 계산
      const minX = Math.min(startPoint.x, x);
      const minY = Math.min(startPoint.y, y);
      const width = Math.abs(x - startPoint.x);
      const height = Math.abs(y - startPoint.y);

      // 업데이트된 영역 목록 생성
      const updatedRegions = regions.map((region) =>
        region.id === selectedRegionId
          ? { ...region, x: minX, y: minY, width, height }
          : region
      );

      onRegionsChange(updatedRegions);
    } else if (isDragging && selectedRegionId) {
      // 기존 영역 이동 (간단한 이동만 구현)
      // 좀 더 복잡한 이동/리사이즈 로직은 필요에 따라 추가
    }
  };

  // 마우스 업 처리
  const handleMouseUp = () => {
    if (!isEditable) return;

    // 너무 작은 영역은 삭제
    if (isCreating && selectedRegionId) {
      const currentRegion = regions.find((r) => r.id === selectedRegionId);
      if (
        currentRegion &&
        (currentRegion.width < 10 || currentRegion.height < 10)
      ) {
        onRegionsChange(regions.filter((r) => r.id !== selectedRegionId));
      }
    }

    setIsDragging(false);
    setIsCreating(false);
    setSelectedRegionId(null);
  };

  // 영역 삭제 처리
  const handleDeleteRegion = (id: string) => {
    if (!isEditable) return;
    onRegionsChange(regions.filter((region) => region.id !== id));
  };

  // 컨테이너 밖으로 마우스가 나갈 경우 처리
  const handleMouseLeave = () => {
    if (isDragging || isCreating) {
      handleMouseUp();
    }
  };

  return (
    <div className="relative select-none">
      <div
        ref={containerRef}
        className="relative cursor-crosshair"
        style={{ width: thumbnailWidth, height: thumbnailHeight }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <img
          ref={imageRef}
          src={thumbnailUrl}
          alt="화면 미리보기"
          className="absolute top-0 left-0 w-full h-full object-cover"
        />

        {/* 블러 영역 렌더링 */}
        {regions.map((region) => (
          <div
            key={region.id}
            className={`absolute border-2 bg-[rgba(255,0,0,0.2)] ${
              region.id === selectedRegionId
                ? "border-blue-500"
                : "border-red-500"
            }`}
            style={{
              left: region.x,
              top: region.y,
              width: region.width,
              height: region.height,
            }}
          >
            {isEditable && (
              <button
                type="button"
                className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteRegion(region.id);
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {isEditable && (
        <div className="mt-2 text-[var(--text-muted)] text-sm">
          <p>
            블러 영역을 추가하려면 드래그하세요. 영역을 삭제하려면 영역의 X
            버튼을 클릭하세요.
          </p>
        </div>
      )}
    </div>
  );
};

export default BlurRegionSelector;
