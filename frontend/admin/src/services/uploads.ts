import api from './api';

export const uploadService = {
    upload: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await api.post<{ url: string; filename: string }>('/uploads', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return data;
    },
};
