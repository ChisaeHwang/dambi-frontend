import { useState, useEffect, useRef, useCallback } from "react";
import { TimelapseMetadata } from "./useTimelapseSession";

export const useFramePlayer = (
  frames: string[],
  metadata: TimelapseMetadata | null
) => {
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const fpsRef = useRef<number>(30); // 기본 FPS 설정

  // 메타데이터 기반 FPS 설정
  useEffect(() => {
    if (metadata) {
      // 타임랩스 속도를 고려한 FPS 계산
      const calculatedFps = (1 / metadata.interval) * metadata.speedFactor;
      fpsRef.current = Math.min(Math.max(calculatedFps, 1), 30); // 1~30fps 범위로 제한
    }
  }, [metadata]);

  // 애니메이션 프레임 함수
  const animate = useCallback(
    (time: number) => {
      if (!isPlaying) return;

      // FPS 제어
      const frameInterval = 1000 / fpsRef.current;
      const elapsed = time - lastFrameTimeRef.current;

      if (elapsed > frameInterval) {
        lastFrameTimeRef.current = time - (elapsed % frameInterval);

        setCurrentFrame((prevFrame) => {
          if (prevFrame >= frames.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prevFrame + 1;
        });
      }

      animationRef.current = window.requestAnimationFrame(animate);
    },
    [isPlaying, frames.length]
  );

  // 재생 상태 변경 시 애니메이션 제어
  useEffect(() => {
    if (isPlaying) {
      lastFrameTimeRef.current = window.performance.now();
      animationRef.current = window.requestAnimationFrame(animate);
    } else if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
    }

    // 컴포넌트 언마운트 시 애니메이션 정리
    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animate]);

  // 재생/일시정지 토글
  const togglePlay = () => {
    if (frames.length === 0) return;

    if (currentFrame >= frames.length - 1 && !isPlaying) {
      setCurrentFrame(0);
    }

    setIsPlaying(!isPlaying);
  };

  // 프레임 변경 핸들러
  const changeFrame = (frameIndex: number) => {
    setCurrentFrame(frameIndex);
  };

  // 재생 속도 변경
  const changeFps = (fps: number) => {
    fpsRef.current = fps;
  };

  return {
    currentFrame,
    isPlaying,
    togglePlay,
    changeFrame,
    changeFps,
  };
};
