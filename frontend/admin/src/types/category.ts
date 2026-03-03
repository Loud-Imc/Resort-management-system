export interface PropertyCategory {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    description?: string;
    isActive: boolean;
    position: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePropertyCategoryDto {
    name: string;
    slug: string;
    icon?: string;
    description?: string;
    isActive?: boolean;
    position?: number;
}

export interface UpdatePropertyCategoryDto {
    name?: string;
    slug?: string;
    icon?: string;
    description?: string;
    isActive?: boolean;
    position?: number;
}
