import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateConfigQueryDto } from './dto/update-config-query.dto';
import { UpdatePolicyAdminDto } from './dto/update-policy-admin.dto';
import { compareSemver } from './utils/semver-comparator';

export interface PublicAppUpdateConfigResponse {
  platform: string;
  currentVersion: string;
  minimumSupportedVersion: string;
  latestVersion: string;
  updateType: 'none' | 'optional' | 'force';
  updateRequired: boolean;
  title: string;
  message: string;
  storeUrl: string;
  policyVersion: number;
  publishedAt: Date;
}

@Injectable()
export class AppUpdateService implements OnModuleInit {
  private readonly logger = new Logger(AppUpdateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultPolicies();
  }

  /**
   * Ensure default policies for android and ios exist
   */
  async seedDefaultPolicies() {
    try {
      const defaults = [
        {
          platform: 'android',
          minimumSupportedVersion: '1.0.0',
          latestVersion: '1.0.0',
          updateType: 'none',
          title: 'Update Required',
          message: 'A new version of the app is required to continue using the service.',
          storeUrl: 'https://play.google.com/store/apps/details?id=com.oreedu.app',
          enabled: true,
          rolloutPercentage: 100,
          policyVersion: 1,
        },
        {
          platform: 'ios',
          minimumSupportedVersion: '1.0.0',
          latestVersion: '1.0.0',
          updateType: 'none',
          title: 'Update Required',
          message: 'A new version of the app is required to continue using the service.',
          storeUrl: 'https://apps.apple.com/app/id6740000000',
          enabled: true,
          rolloutPercentage: 100,
          policyVersion: 1,
        },
      ];

      for (const def of defaults) {
        await (this.prisma as any).appUpdatePolicy.upsert({
          where: { platform: def.platform },
          update: {},
          create: def,
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to seed default app update policies: ${error.message}`);
    }
  }

  /**
   * Public evaluation endpoint for mobile client startup/resume
   */
  async getPublicConfig(query: UpdateConfigQueryDto): Promise<PublicAppUpdateConfigResponse> {
    const platform = query.platform.toLowerCase();
    const clientVersion = query.version?.trim();

    const policy = await (this.prisma as any).appUpdatePolicy.findUnique({
      where: { platform },
    });

    if (!policy || !policy.enabled) {
      return {
        platform,
        currentVersion: clientVersion || '1.0.0',
        minimumSupportedVersion: '1.0.0',
        latestVersion: '1.0.0',
        updateType: 'none',
        updateRequired: false,
        title: 'App Up to Date',
        message: 'You are running the latest version.',
        storeUrl: '',
        policyVersion: policy?.policyVersion ?? 1,
        publishedAt: policy?.publishedAt ?? new Date(),
      };
    }

    let evaluatedType: 'none' | 'optional' | 'force' = 'none';
    let updateRequired = false;

    if (clientVersion) {
      const isBelowMinimum = compareSemver(clientVersion, policy.minimumSupportedVersion) < 0;
      const isBelowLatest = compareSemver(clientVersion, policy.latestVersion) < 0;

      if (isBelowMinimum) {
        // Installed version is below minimum allowed version -> FORCE
        evaluatedType = 'force';
        updateRequired = true;
      } else if (isBelowLatest) {
        // Installed version is >= minimum but < latest
        evaluatedType = policy.updateType === 'force' ? 'optional' : (policy.updateType as any) || 'optional';
        updateRequired = false;
      } else {
        // Installed version is >= latest
        evaluatedType = 'none';
        updateRequired = false;
      }
    } else {
      // If version wasn't supplied, return policy's configured updateType
      evaluatedType = (policy.updateType as any) || 'none';
      updateRequired = evaluatedType === 'force';
    }

    return {
      platform: policy.platform,
      currentVersion: clientVersion || policy.latestVersion,
      minimumSupportedVersion: policy.minimumSupportedVersion,
      latestVersion: policy.latestVersion,
      updateType: evaluatedType,
      updateRequired,
      title: policy.title,
      message: policy.message,
      storeUrl: policy.storeUrl,
      policyVersion: policy.policyVersion,
      publishedAt: policy.publishedAt,
    };
  }

  /**
   * Admin: Get all policies (Android & iOS)
   */
  async getAdminPolicies() {
    const policies = await (this.prisma as any).appUpdatePolicy.findMany({
      orderBy: { platform: 'asc' },
    });

    // Structure as an object with android and ios properties for easy UI consumption
    const policyMap: Record<string, any> = {};
    for (const p of policies) {
      policyMap[p.platform] = p;
    }

    return {
      policies,
      android: policyMap['android'] || null,
      ios: policyMap['ios'] || null,
    };
  }

  /**
   * Admin: Update policy for a specific platform
   */
  async updateAdminPolicy(platform: string, dto: UpdatePolicyAdminDto, userId?: string) {
    const normalizedPlatform = platform.toLowerCase();

    const existing = await (this.prisma as any).appUpdatePolicy.findUnique({
      where: { platform: normalizedPlatform },
    });

    if (existing) {
      return (this.prisma as any).appUpdatePolicy.update({
        where: { platform: normalizedPlatform },
        data: {
          minimumSupportedVersion: dto.minimumSupportedVersion,
          latestVersion: dto.latestVersion,
          updateType: dto.updateType,
          title: dto.title,
          message: dto.message,
          storeUrl: dto.storeUrl,
          enabled: dto.enabled ?? true,
          rolloutPercentage: dto.rolloutPercentage ?? 100,
          policyVersion: { increment: 1 },
          publishedAt: new Date(),
          updatedById: userId,
        },
      });
    }

    return (this.prisma as any).appUpdatePolicy.create({
      data: {
        platform: normalizedPlatform,
        minimumSupportedVersion: dto.minimumSupportedVersion,
        latestVersion: dto.latestVersion,
        updateType: dto.updateType,
        title: dto.title,
        message: dto.message,
        storeUrl: dto.storeUrl,
        enabled: dto.enabled ?? true,
        rolloutPercentage: dto.rolloutPercentage ?? 100,
        policyVersion: 1,
        publishedAt: new Date(),
        createdById: userId,
        updatedById: userId,
      },
    });
  }
}
