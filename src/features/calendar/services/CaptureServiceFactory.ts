import { ICaptureService } from "./ICaptureService";
import { browserCaptureAdapter } from "./adapters/BrowserCaptureAdapter";
import { electronCaptureAdapter } from "./adapters/ElectronCaptureAdapter";
import { isElectronEnvironment } from "./ElectronSessionAdapter";

/**
 * 캡처 서비스 팩토리 클래스
 * 환경에 따라 적절한 캡처 서비스 인스턴스를 제공합니다.
 */
export class CaptureServiceFactory {
  private static instance: ICaptureService | null = null;

  /**
   * 적절한 캡처 서비스 인스턴스를 반환합니다.
   * 싱글톤 패턴으로 구현되어 항상 동일한 인스턴스가 반환됩니다.
   */
  static getCaptureService(): ICaptureService {
    if (!this.instance) {
      this.instance = isElectronEnvironment()
        ? electronCaptureAdapter
        : browserCaptureAdapter;
    }
    return this.instance;
  }
}
