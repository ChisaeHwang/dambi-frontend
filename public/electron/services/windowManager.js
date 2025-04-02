const { desktopCapturer, screen } = require("electron");

/**
 * 시스템의 모든 화면 정보를 가져오는 함수
 * @returns {Object} 메인 화면 해상도 정보
 */
function getDisplayResolution() {
  try {
    // screen이 존재하는지 확인
    if (!screen) {
      console.warn(
        "screen 객체가 존재하지 않습니다. 기본 해상도를 사용합니다."
      );
      return { width: 1920, height: 1080 };
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const allDisplays = screen.getAllDisplays();

    console.log("모든 화면 정보:");
    allDisplays.forEach((display, index) => {
      console.log(
        `화면 ${index + 1}: ${display.size.width}x${
          display.size.height
        } (작업영역: ${display.workArea.width}x${display.workArea.height})`
      );
    });

    // primaryDisplay가 유효한지 확인
    if (!primaryDisplay || !primaryDisplay.size) {
      console.warn(
        "기본 디스플레이 정보를 가져올 수 없습니다. 기본 해상도를 사용합니다."
      );
      return { width: 1920, height: 1080 };
    }

    return {
      width: primaryDisplay.size.width,
      height: primaryDisplay.size.height,
    };
  } catch (error) {
    console.error("화면 정보 가져오기 오류:", error);
    return { width: 1920, height: 1080 }; // 기본값
  }
}

/**
 * 활성 창 목록을 가져오는 함수
 * @returns {Promise<Array>} 활성 창 목록
 */
async function getActiveWindows() {
  return new Promise(async (resolve) => {
    try {
      // 화면 해상도 가져오기
      const { width: displayWidth, height: displayHeight } =
        getDisplayResolution();

      console.log(`실제 모니터 해상도: ${displayWidth}x${displayHeight}`);

      // 썸네일 크기 설정 (더 큰 크기로 설정)
      const thumbnailWidth = Math.floor(displayWidth / 2.5);
      const thumbnailHeight = Math.floor(displayHeight / 2.5);

      console.log(`썸네일 크기 설정: ${thumbnailWidth}x${thumbnailHeight}`);

      // 모든 소스 정보 한번에 가져오기
      const allSources = await desktopCapturer.getSources({
        types: ["window", "screen"],
        thumbnailSize: { width: thumbnailWidth, height: thumbnailHeight },
        fetchWindowIcons: true,
      });

      console.log(`캡처된 소스: 총 ${allSources.length}개`);

      // 창 이름 출력
      allSources.forEach((source, index) => {
        console.log(`${index}: ${source.id} - ${source.name}`);
      });

      // 결과 목록 준비
      const resultWindows = [];

      // 제외할 창 이름 목록을 축소
      const excludePatterns = [
        "담비",
        "program manager",
        "window host",
        "task manager",
        "settings",
        "control panel",
      ];

      // 우선순위가 높은 브라우저 패턴
      const browserPatterns = [
        "chrome",
        "edge",
        "firefox",
        "브라우저",
        "browser",
        "웹",
        "web",
      ];

      // 처리된 창 ID 추적
      const processedIds = new Set();

      // 우선순위 높은 창부터 추가
      const priorityWindows = [];
      const normalWindows = [];
      const screenWindows = [];

      // 타임스탬프 추가 (캐시 방지용)
      const timestamp = Date.now();

      // 창 분류
      for (const source of allSources) {
        try {
          // 이미 처리된 ID 건너뛰기
          if (processedIds.has(source.id)) continue;
          processedIds.add(source.id);

          // 창 타입 확인
          const isScreenSource = source.id.startsWith("screen:");

          // 화면 소스는 별도 처리
          if (isScreenSource) {
            try {
              if (!source.thumbnail || source.thumbnail.isEmpty()) continue;

              // 썸네일을 Base64 문자열로 직접 변환
              const thumbnailDataUrl = source.thumbnail.toDataURL();

              screenWindows.push({
                id: source.id,
                name: "전체 화면",
                thumbnailDataUrl, // 직접 Base64 문자열 전달
                thumbnailWidth: source.thumbnail.getSize().width,
                thumbnailHeight: source.thumbnail.getSize().height,
                appIcon: null,
                isScreen: true,
                width: displayWidth,
                height: displayHeight,
                x: 0,
                y: 0,
                isMainScreen:
                  source.id === `screen:${screen.getPrimaryDisplay().id}`,
                displayId: source.id.split(":")[1],
                timestamp, // 캐시 방지를 위한 타임스탬프 추가
              });
            } catch (err) {
              console.error("화면 소스 처리 오류:", err);
            }
            continue;
          }

          // 창 필터링
          const sourceName = source.name.toLowerCase();

          // 제외할 패턴 확인
          const shouldExclude = excludePatterns.some((pattern) =>
            sourceName.includes(pattern.toLowerCase())
          );

          if (shouldExclude) continue;
          if (!source.name || source.name.trim() === "") continue;
          if (!source.thumbnail || source.thumbnail.isEmpty()) continue;

          // 썸네일 변환 시도
          let thumbnailDataUrl;
          try {
            thumbnailDataUrl = source.thumbnail.toDataURL();
          } catch (thumbError) {
            console.error(`썸네일 변환 오류 (${source.name}):`, thumbError);
            continue; // 썸네일 변환 실패 시 이 창은 건너뛰기
          }

          // 썸네일 크기 확인
          const thumbSize = source.thumbnail.getSize();
          if (thumbSize.width < 20 || thumbSize.height < 20) continue;

          // 창 크기 계산
          let windowWidth = Math.round(thumbSize.width * 3);
          let windowHeight = Math.round(thumbSize.height * 3);

          // 적절한 크기 확인
          if (windowWidth < 640 || windowHeight < 480) {
            windowWidth = 1280;
            windowHeight = 720;
          }

          // 창 정보 생성 (NativeImage 객체 대신 Base64 문자열 사용)
          const windowInfo = {
            id: source.id,
            name: source.name,
            thumbnailDataUrl, // 직접 Base64 문자열 전달
            thumbnailWidth: thumbSize.width,
            thumbnailHeight: thumbSize.height,
            appIcon: null, // 앱 아이콘은 필요 없으므로 null로 설정
            isScreen: false,
            width: windowWidth,
            height: windowHeight,
            x: 0,
            y: 0,
            timestamp, // 캐시 방지를 위한 타임스탬프 추가
          };

          // 브라우저 우선순위 확인
          const isBrowser = browserPatterns.some((pattern) =>
            sourceName.includes(pattern.toLowerCase())
          );

          // 우선순위에 따라 분류
          if (isBrowser) {
            console.log(`브라우저 창 발견: ${source.name}`);
            priorityWindows.push(windowInfo);
          } else {
            normalWindows.push(windowInfo);
          }
        } catch (windowError) {
          console.error(`창 처리 오류 (${source.name}):`, windowError);
          continue;
        }
      }

      // 우선순위대로 결과 목록에 추가
      resultWindows.push(...priorityWindows);
      resultWindows.push(...normalWindows);
      resultWindows.push(...screenWindows);

      console.log(`최종 처리된 창 목록: ${resultWindows.length}개`);
      console.log("우선순위 창:", priorityWindows.length);
      console.log("일반 창:", normalWindows.length);
      console.log("화면:", screenWindows.length);

      resolve(resultWindows);
    } catch (error) {
      console.error("창 목록 가져오기 오류:", error);

      // 모니터 해상도 가져오기 시도
      const { width: screenWidth, height: screenHeight } =
        getDisplayResolution();
      console.log(
        `fallback에서 감지한 모니터 해상도: ${screenWidth}x${screenHeight}`
      );

      // 오류 발생 시 기본 목록 제공 (동적 해상도 적용)
      const fallbackWindows = [
        {
          id: "screen:0",
          name: "전체 화면",
          thumbnailDataUrl: null,
          appIcon: null,
          isScreen: true,
          width: screenWidth, // 동적으로 감지한 해상도 사용
          height: screenHeight, // 동적으로 감지한 해상도 사용
          x: 0,
          y: 0,
          isMainScreen: true,
          displayId: "0",
          timestamp: Date.now(),
        },
      ];

      resolve(fallbackWindows);
    }
  });
}

module.exports = {
  getActiveWindows,
  getDisplayResolution,
};
