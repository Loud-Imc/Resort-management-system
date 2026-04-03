import api from './api';

export const uploadService = {
    upload: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await api.post('/uploads', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    },
    uploadMultiple: async (files: File[]) => {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        const { data } = await api.post('/uploads/bulk', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data;
    },
};

// Keep backward-compatible alias
export const uploadsService = uploadService;
