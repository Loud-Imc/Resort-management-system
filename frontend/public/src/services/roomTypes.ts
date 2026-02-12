import axios from 'axios';
import { RoomType } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const roomTypeApi = {
    // Get room type by ID
    async getById(id: string): Promise<RoomType> {
        const response = await api.get(`/room-types/${id}`);
        return response.data;
    },

    // Get all room types for a property
    async getByPropertyId(propertyId: string): Promise<RoomType[]> {
        const response = await api.get('/room-types', {
            params: { propertyId, publicOnly: true }
        });
        return response.data;
    }
};

export default api;
