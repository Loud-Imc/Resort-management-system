import { Injectable, Logger } from '@nestjs/common';
import { SystemSettingsService } from '../../system-settings/system-settings.service';

export interface GlobalCapabilities {
  contentEditing: boolean;
  availabilitySync: boolean;
  rateSync: boolean;
  restrictionSync: boolean;
  reservationSync: boolean;
}

export const DEFAULT_GLOBAL_CAPABILITIES: GlobalCapabilities = {
  contentEditing: false,
  availabilitySync: true,
  rateSync: true,
  restrictionSync: true,
  reservationSync: true,
};

@Injectable()
export class ConnectivitySettingsService {
  private readonly logger = new Logger(ConnectivitySettingsService.name);
  private readonly SETTING_KEY = 'CONNECTIVITY_GLOBAL_CAPABILITIES';

  constructor(private readonly systemSettingsService: SystemSettingsService) {}

  async getGlobalCapabilities(): Promise<GlobalCapabilities> {
    const rawSetting = await this.systemSettingsService.getSetting(this.SETTING_KEY);
    if (!rawSetting) {
      return DEFAULT_GLOBAL_CAPABILITIES;
    }
    return {
      ...DEFAULT_GLOBAL_CAPABILITIES,
      ...(typeof rawSetting === 'object' ? rawSetting : {}),
    };
  }

  async updateGlobalCapabilities(updates: Partial<GlobalCapabilities>): Promise<GlobalCapabilities> {
    const current = await this.getGlobalCapabilities();
    const newCapabilities: GlobalCapabilities = {
      ...current,
      ...updates,
    };
    await this.systemSettingsService.updateSetting(
      this.SETTING_KEY,
      newCapabilities,
      'Global OTA Connectivity Platform capability switches (Platform-wide)'
    );
    this.logger.log(`Updated Global Connectivity Capabilities: ${JSON.stringify(newCapabilities)}`);
    return newCapabilities;
  }

  async isCapabilityEnabled(key: keyof GlobalCapabilities): Promise<boolean> {
    const caps = await this.getGlobalCapabilities();
    return !!caps[key];
  }

  getSandboxPropertyCode(): string {
    return 'TEST-PROP-001';
  }
}
