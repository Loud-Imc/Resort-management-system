import api from './api';

export interface AppUpdatePolicy {
  id?: string;
  platform: 'android' | 'ios';
  minimumSupportedVersion: string;
  latestVersion: string;
  updateType: 'none' | 'optional' | 'force';
  title: string;
  message: string;
  storeUrl: string;
  enabled: boolean;
  rolloutPercentage: number;
  policyVersion: number;
  publishedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppUpdatePoliciesResponse {
  policies: AppUpdatePolicy[];
  android: AppUpdatePolicy | null;
  ios: AppUpdatePolicy | null;
}

export const appUpdateService = {
  getPolicies: async (): Promise<AppUpdatePoliciesResponse> => {
    const response = await api.get<AppUpdatePoliciesResponse>('/v1/admin/app-update');
    return response.data;
  },

  updatePolicy: async (
    platform: 'android' | 'ios',
    data: Partial<AppUpdatePolicy>
  ): Promise<AppUpdatePolicy> => {
    const response = await api.put<AppUpdatePolicy>(`/v1/admin/app-update/${platform}`, data);
    return response.data;
  },
};
