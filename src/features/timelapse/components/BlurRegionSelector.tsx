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

    // 비율 계산 (이미지 좌표 <-> 캔버스 좌표 변환용)
    const scaleFactorX = imageSize.width / canvas.width;
    const scaleFactorY = imageSize.height / canvas.height;

    // 디버깅용 로그 (문제 해결 후 제거 가능)
    console.log(`스케일 팩터: X=${scaleFactorX}, Y=${scaleFactorY}`);
    console.log(`캔버스 크기: ${canvas.width}x${canvas.height}`);
    console.log(`이미지 크기: ${imageSize.width}x${imageSize.height}`);
    console.log(`현재 스케일: ${scale}`);
    console.log(
      `표시 크기: ${imageSize.width * scale}x${imageSize.height * scale}`
    );

    // 블러 영역 그리기
    regions.forEach((region, index) => {
      const isSelected = region.id === selectedRegionId;

      // 스케일 적용 (이미지 좌표 -> 캔버스 좌표)
      const scaledX = region.x / scaleFactorX;
      const scaledY = region.y / scaleFactorY;
      const scaledWidth = region.width / scaleFactorX;
      const scaledHeight = region.height / scaleFactorY;

      // 디버깅용 로그 (문제 해결 후 제거 가능)
      console.log(
        `영역 ${index + 1}: 원본(${region.x},${region.y},${region.width},${region.height}), 스케일(${scaledX},${scaledY},${scaledWidth},${scaledHeight})`
      );

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

      // X 버튼 그리기 (크기 조정 및 디자인 개선)
      const btnSize = 20; // 크기 줄임
      const btnX = scaledX + scaledWidth - btnSize - 4;
      const btnY = scaledY + 4;

      // X 버튼 배경 - 호버 효과 적용
      const isHovered = region.id === hoveredDeleteButton;
      ctx.fillStyle = isHovered
        ? "rgba(255, 0, 0, 1)"
        : "rgba(255, 0, 0, 0.75)";

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
        ctx.shadowBlur = 3;
      }

      // X 표시
      ctx.strokeStyle = "white";
      ctx.lineWidth = isHovered ? 2 : 1.5;
      ctx.beginPath();
      ctx.moveTo(btnX + 6, btnY + 6);
      ctx.lineTo(btnX + btnSize - 6, btnY + btnSize - 6);
      ctx.moveTo(btnX + btnSize - 6, btnY + 6);
      ctx.lineTo(btnX + 6, btnY + btnSize - 6);
      ctx.stroke();

      // 그림자 초기화
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    });

    // 현재 그리는 영역 미리보기
    if (isDrawing && currentRegion) {
      const scaledX = currentRegion.x / scaleFactorX;
      const scaledY = currentRegion.y / scaleFactorY;
      const scaledWidth = currentRegion.width / scaleFactorX;
      const scaledHeight = currentRegion.height / scaleFactorY;

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
    scale,
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

      console.log(`이미지 로드됨: ${img.width}x${img.height}`);

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

    console.log(
      `마우스 다운: clientXY(${e.clientX},${e.clientY}), canvasXY(${canvasX},${canvasY}), imageXY(${x},${y})`
    );

    // X 버튼 클릭 확인
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];

      // 이미지 좌표를 캔버스 좌표로 변환
      const scaledX = region.x / scaleFactorX;
      const scaledY = region.y / scaleFactorY;
      const scaledWidth = region.width / scaleFactorX;

      const btnSize = 20; // X 버튼 크기 (줄임)
      const btnX = scaledX + scaledWidth - btnSize - 4;
      const btnY = scaledY + 4;

      // 버튼 중심 좌표
      const btnCenterX = btnX + btnSize / 2;
      const btnCenterY = btnY + btnSize / 2;

      // 클릭 지점과 버튼 중심 사이의 거리 계산
      const distance = Math.sqrt(
        Math.pow(canvasX - btnCenterX, 2) + Math.pow(canvasY - btnCenterY, 2)
      );

      // 디버깅용 로그
      console.log(
        `버튼 ${i + 1}: 중심(${btnCenterX},${btnCenterY}), 거리=${distance}, 크기=${btnSize / 2}`
      );

      // 버튼 반경 내에 클릭했는지 확인
      if (distance <= btnSize / 2) {
        console.log(`X 버튼 ${i + 1} 클릭됨`);

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

      console.log(`새 영역 시작: (${x},${y})`);
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

      const btnSize = 20; // X 버튼 크기 (줄임)
      const btnX = scaledX + scaledWidth - btnSize - 4;
      const btnY = scaledY + 4;

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

      // 디버깅용 로그
      if (width > 0 && height > 0) {
        console.log(
          `드래그 중: 시작(${startPoint.x},${startPoint.y}), 현재(${imageX},${imageY}), 크기(${width},${height})`
        );
      }

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
              imageRendering: "crisp-edges", // 이미지 렌더링 품질 개선
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
