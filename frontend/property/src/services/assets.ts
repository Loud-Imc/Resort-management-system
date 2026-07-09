import api from './api';

export interface Asset {
  id: string;
  propertyId: string;
  roomId?: string | null;
  name: string;
  category: string;
  ownership: 'LESSOR' | 'LESSEE';
  quantity: number;
  condition: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  location?: string | null;
  purchaseDate?: string | null;
  value?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  room?: {
    id: string;
    roomNumber: string;
    roomType?: {
      name: string;
    };
  } | null;
}

export interface CreateAssetDto {
  propertyId: string;
  roomId?: string;
  name: string;
  category: string;
  ownership: 'LESSOR' | 'LESSEE';
  quantity?: number;
  condition?: 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  location?: string;
  purchaseDate?: string;
  value?: number;
  notes?: string;
}

export interface UpdateAssetDto extends Partial<CreateAssetDto> {}

export const assetsService = {
  getAll: async (params: { propertyId: string; ownership?: string; condition?: string; categoryId?: string }) => {
    const { data } = await api.get<Asset[]>('/assets', { params });
    return data;
  },

  getById: async (id: string) => {
    const { data } = await api.get<Asset>(`/assets/${id}`);
    return data;
  },

  create: async (payload: CreateAssetDto) => {
    const { data } = await api.post<Asset>('/assets', payload);
    return data;
  },

  update: async (id: string, payload: UpdateAssetDto) => {
    const { data } = await api.patch<Asset>(`/assets/${id}`, payload);
    return data;
  },

  delete: async (id: string) => {
    const { data } = await api.delete(`/assets/${id}`);
    return data;
  },
};
