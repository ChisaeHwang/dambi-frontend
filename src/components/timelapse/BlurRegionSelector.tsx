import React, { useState, useRef, useEffect } from "react";

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

  // 컨테이너 크기 업데이트
  useEffect(() => {
    // containerRef에 접근하지만 상태를 설정할 필요가 없습니다.
    // 모든 계산은 실시간으로 수행됩니다.
  }, []);

  // 좌표 변환 함수 (화면 좌표 → 원본 좌표)
  const convertToOriginalCoordinates = (x: number, y: number) => {
    if (!containerRef.current) return { x, y };

    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = thumbnailWidth / rect.width;
    const scaleY = thumbnailHeight / rect.height;

    return {
      x: (x - rect.left) * scaleX,
      y: (y - rect.top) * scaleY,
    };
  };

  // 드래그 시작 처리
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditable) return;

    const { x, y } = convertToOriginalCoordinates(e.clientX, e.clientY);

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

    const { x, y } = convertToOriginalCoordinates(e.clientX, e.clientY);

    // 좌표 범위 제한
    const clampedX = Math.max(0, Math.min(x, thumbnailWidth));
    const clampedY = Math.max(0, Math.min(y, thumbnailHeight));

    if (isCreating && selectedRegionId) {
      // 새 영역 크기 계산
      const minX = Math.min(startPoint.x, clampedX);
      const minY = Math.min(startPoint.y, clampedY);
      const width = Math.abs(clampedX - startPoint.x);
      const height = Math.abs(clampedY - startPoint.y);

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
      } else if (currentRegion) {
        // 유효한 크기의 영역이 생성 완료되었을 때만 로그 출력
        console.log("블러 영역 생성 완료:", {
          id: currentRegion.id,
          x: currentRegion.x,
          y: currentRegion.y,
          width: currentRegion.width,
          height: currentRegion.height,
        });
      }
    }

    setIsDragging(false);
    setIsCreating(false);
    setSelectedRegionId(null);
  };

  // 영역 삭제 처리
  const handleDeleteRegion = (id: string) => {
    if (!isEditable) return;
    // 삭제 시 중요: 로그를 통해 삭제 이벤트 추적
    console.log("블러 영역 삭제:", id);
    // 명시적으로 새 배열을 생성하여 삭제
    const newRegions = regions.filter((region) => region.id !== id);
    onRegionsChange(newRegions);
  };

  // 컨테이너 밖으로 마우스가 나갈 경우 처리
  const handleMouseLeave = () => {
    if (isDragging || isCreating) {
      handleMouseUp();
    }
  };

  // 원본 좌표를 화면 좌표로 변환
  const convertToDisplayCoordinates = (region: BlurRegion) => {
    if (!containerRef.current) {
      return {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
      };
    }

    const container = containerRef.current;
    const scaleX = container.clientWidth / thumbnailWidth;
    const scaleY = container.clientHeight / thumbnailHeight;

    return {
      left: region.x * scaleX,
      top: region.y * scaleY,
      width: region.width * scaleX,
      height: region.height * scaleY,
    };
  };

  return (
    <div className="relative select-none">
      <div
        ref={containerRef}
        className="relative cursor-crosshair mx-auto"
        style={{
          width: Math.min(1600, thumbnailWidth * 4),
          height: Math.min(1200, thumbnailHeight * 4),
          maxWidth: "100%",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <img
          ref={imageRef}
          src={thumbnailUrl}
          alt="화면 미리보기"
          className="absolute top-0 left-0 w-full h-full object-contain border border-gray-700"
          style={{
            imageRendering: "crisp-edges" as const,
          }}
        />

        {/* 블러 영역 렌더링 */}
        {regions.map((region) => {
          const { left, top, width, height } =
            convertToDisplayCoordinates(region);
          return (
            <div
              key={region.id}
              className={`absolute border-2 bg-[rgba(255,0,0,0.2)] ${
                region.id === selectedRegionId
                  ? "border-blue-500"
                  : "border-red-500"
              }`}
              style={{
                left,
                top,
                width,
                height,
              }}
            >
              {isEditable && (
                <button
                  type="button"
                  className="absolute -top-4 -right-4 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-xl shadow-md hover:bg-red-600 z-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeleteRegion(region.id);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isEditable && (
        <div className="mt-4 text-[var(--text-muted)] text-sm">
          <p>
            블러 영역을 추가하려면 드래그하세요. 영역을 삭제하려면 영역의 X
            버튼을 클릭하세요.
          </p>
          <p className="mt-2 text-[var(--primary-color)]">
            * 블러 영역은 원본 화면 비율에 맞춰 조정됩니다.
          </p>
          <p className="mt-2">
            현재 설정된 블러 영역 수: <strong>{regions.length}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

export default BlurRegionSelector;
