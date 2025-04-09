import { useState } from "react";
import { TimelapseOptions } from "../types";
import {
  timelapseStorageService,
  timelapseService,
  isElectronAvailable,
} from "../../../services";

/**
 * 타임랩스 옵션 관리를 위한 훅
 */
export const useTimelapseOptions = () => {
  // 타임랩스 옵션 상태
  const [timelapseOptions, setTimelapseOptions] = useState<TimelapseOptions>(
    () => {
      // 로컬 스토리지에서 설정 불러오기
      return timelapseStorageService.getOptions<TimelapseOptions>({
        speedFactor: 6, // 기본 6배속
        outputQuality: "medium",
        outputFormat: "mp4",
        preserveOriginals: true, // 기본적으로 원본 파일 보존
        enabled: true, // 기본적으로 타임랩스 활성화
        blurRegions: [], // 기본적으로 블러 영역 없음
      });
    }
  );

  // 타임랩스 옵션 변경 핸들러
  const changeTimelapseOptions = (options: Partial<TimelapseOptions>) => {
    setTimelapseOptions((prev) => {
      // 이전 값과 동일한지 비교 (블러 영역의 경우 깊은 비교 필요)
      if (options.blurRegions) {
        const prevBlurRegions = prev.blurRegions || [];
        const newBlurRegions = options.blurRegions;

        // 이전 블러 영역과 새 블러 영역이 같으면 업데이트하지 않음
        if (
          JSON.stringify(prevBlurRegions) === JSON.stringify(newBlurRegions)
        ) {
          // 다른 변경된 옵션이 없다면 이전 상태 그대로 반환
          const hasOtherChanges = Object.keys(options).some(
            (key) =>
              key !== "blurRegions" &&
              options[key as keyof TimelapseOptions] !==
                prev[key as keyof TimelapseOptions]
          );

          if (!hasOtherChanges) {
            return prev; // 변경 사항이 없으면 이전 상태 그대로 반환
          }
        }
      }

      const newOptions = {
        ...prev,
        ...options,
      };

      // 옵션 변경 시 로컬 스토리지에 저장
      timelapseStorageService.saveOptions(newOptions);

      // 일렉트론 환경이 있는 경우 메인 프로세스에도 설정 변경 전달
      if (isElectronAvailable()) {
        try {
          console.log("일렉트론에 타임랩스 옵션 업데이트:", newOptions);
          // 비동기적으로 처리하되 오류는 무시 (사용자 경험 방해 방지)
          timelapseService.updateTimelapseOptions(newOptions).catch((err) => {
            console.error("타임랩스 옵션 업데이트 오류:", err);
          });
        } catch (error) {
          console.error("타임랩스 옵션 업데이트 중 오류:", error);
        }
      }

      return newOptions;
    });
  };

  return {
    timelapseOptions,
    changeTimelapseOptions,
  };
};
