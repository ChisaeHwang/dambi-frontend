const { desktopCapturer, screen } = require("electron");

/**
 * 시스템의 모든 화면 정보를 가져오는 함수 - 단순화된 버전
 * @returns {Object} 메인 화면 해상도 정보
 */
function getDisplayResolution() {
  try {
    // screen이 존재하는지 확인
    if (!screen) {
      console.warn("screen 객체를 찾을 수 없습니다. 기본 해상도 사용");
      return { width: 1920, height: 1080 };
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    if (!primaryDisplay || !primaryDisplay.size) {
      console.warn("기본 디스플레이 정보를 가져올 수 없습니다");
      return { width: 1920, height: 1080 };
    }

    // 너비와 높이가 2의 배수가 되도록 조정 (libx264 요구사항)
    let width = primaryDisplay.size.width;
    let height = primaryDisplay.size.height;
    width = Math.floor(width / 2) * 2;
    height = Math.floor(height / 2) * 2;

    return { width, height };
  } catch (error) {
    console.error("화면 정보 가져오기 오류:", error);
    return { width: 1920, height: 1080 }; // 기본값
  }
}

/**
 * 활성 창 목록을 가져오는 함수 - 단순화된 버전
 * @returns {Promise<Array>} 활성 창 목록
 */
async function getActiveWindows() {
  return new Promise(async (resolve) => {
    try {
      // 화면 해상도 가져오기
      const { width: displayWidth, height: displayHeight } =
        getDisplayResolution();

      // 썸네일 크기 설정
      const thumbnailSize = {
        width: Math.floor(displayWidth / 3),
        height: Math.floor(displayHeight / 3),
      };

      // 모니터 정보 가져오기
      const displays = screen ? screen.getAllDisplays() : [];
      const primaryDisplayId = screen ? screen.getPrimaryDisplay().id : 0;

      // 모든 소스 정보 가져오기
      const sources = await desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize,
        fetchWindowIcons: true,
      });

      console.log(`캡처된 소스: ${sources.length}개`);

      // 결과 저장 배열
      const windows = [];

      // 중복 방지를 위한 처리된 ID 집합
      const processedIds = new Set();

      // 제외할 창 이름 목록 (최소화)
      const excludePatterns = ["program manager", "window host"];

      // 타임스탬프 (캐시 방지)
      const timestamp = Date.now();

      // 1. 먼저 화면(모니터) 추가
      for (const source of sources) {
        if (processedIds.has(source.id)) continue;
        if (!source.id.startsWith("screen:")) continue;

        try {
          // 썸네일 데이터 변환
          if (!source.thumbnail || source.thumbnail.isEmpty()) continue;
          const thumbnailDataUrl = source.thumbnail.toDataURL();

          // 디스플레이 ID 추출 및 단순화 (screen:0:0 -> 0)
          let displayId = "0";
          try {
            const parts = source.id.split(":");
            if (parts.length > 1) {
              displayId = parts[1];
            }
          } catch (err) {
            console.error("디스플레이 ID 파싱 오류:", err);
            displayId = "0";
          }

          // 해당 모니터 정보 찾기
          const matchedDisplay = displays.find(
            (d) => d.id.toString() === displayId
          );

          // 디스플레이 정보 구성
          let displayInfo = {
            x: 0,
            y: 0,
            width: displayWidth,
            height: displayHeight,
            isMainScreen: false,
          };

          if (matchedDisplay) {
            // 해상도를 2의 배수로 조정
            const w = Math.floor(matchedDisplay.bounds.width / 2) * 2;
            const h = Math.floor(matchedDisplay.bounds.height / 2) * 2;

            displayInfo = {
              x: matchedDisplay.bounds.x,
              y: matchedDisplay.bounds.y,
              width: w,
              height: h,
              isMainScreen: matchedDisplay.id === primaryDisplayId,
            };
          }

          // 화면 정보 추가 (ID 단순화)
          windows.push({
            id: `screen:${displayId}`, // ID 단순화
            name: displayInfo.isMainScreen
              ? "주 모니터"
              : `모니터 ${displayId}`,
            thumbnailDataUrl,
            thumbnailWidth: source.thumbnail.getSize().width,
            thumbnailHeight: source.thumbnail.getSize().height,
            isScreen: true,
            ...displayInfo,
            displayId, // 단순화된 디스플레이 ID
            timestamp,
          });

          // 처리된 ID 기록
          processedIds.add(source.id);
        } catch (err) {
          console.error("화면 소스 처리 오류:", err);
        }
      }

      // 2. 일반 창 추가
      for (const source of sources) {
        if (processedIds.has(source.id)) continue;
        if (source.id.startsWith("screen:")) continue;

        try {
          // 필터링 조건
          if (!source.name || source.name.trim() === "") continue;
          if (!source.thumbnail || source.thumbnail.isEmpty()) continue;

          // 제외 패턴 확인
          const sourceName = source.name.toLowerCase();
          const shouldExclude = excludePatterns.some((pattern) =>
            sourceName.includes(pattern.toLowerCase())
          );
          if (shouldExclude) continue;

          // 썸네일 데이터 변환
          const thumbnailDataUrl = source.thumbnail.toDataURL();

          // 썸네일 크기
          const thumbSize = source.thumbnail.getSize();
          if (thumbSize.width < 20 || thumbSize.height < 20) continue;

          // 창 크기 추정 (썸네일 기반)
          const windowWidth = Math.floor((thumbSize.width * 3) / 2) * 2; // 2의 배수로 조정
          const windowHeight = Math.floor((thumbSize.height * 3) / 2) * 2; // 2의 배수로 조정

          // 창 위치 추정 (중앙 배치)
          const x = Math.floor((displayWidth - windowWidth) / 2 / 2) * 2; // 2의 배수로 조정
          const y = Math.floor((displayHeight - windowHeight) / 2 / 2) * 2; // 2의 배수로 조정

          // 창 정보 추가
          windows.push({
            id: source.id,
            name: source.name,
            thumbnailDataUrl,
            thumbnailWidth: thumbSize.width,
            thumbnailHeight: thumbSize.height,
            isScreen: false,
            width: windowWidth,
            height: windowHeight,
            x,
            y,
            timestamp,
          });

          // 처리된 ID 기록
          processedIds.add(source.id);
        } catch (err) {
          console.error(`창 처리 오류 (${source.name}):`, err);
        }
      }

      // 결과 반환
      console.log(`최종 창 목록: ${windows.length}개`);
      resolve(windows);
    } catch (error) {
      console.error("창 목록 가져오기 오류:", error);

      // 오류 발생 시 기본 전체 화면만 제공
      const { width, height } = getDisplayResolution();
      resolve([
        {
          id: "screen:0",
          name: "전체 화면",
          thumbnailDataUrl: null,
          isScreen: true,
          width,
          height,
          x: 0,
          y: 0,
          isMainScreen: true,
          displayId: "0",
          timestamp: Date.now(),
        },
      ]);
    }
  });
}

module.exports = {
  getActiveWindows,
  getDisplayResolution,
};
