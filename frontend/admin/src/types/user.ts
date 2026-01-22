export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions?: string[];
    isSystem?: boolean;
}

export interface Permission {
    id: string;
    name: string;
    module: string;
    description: string;
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    isActive: boolean;
    roles: { role: Role }[];
    bookings?: any[];
    lastLogin?: string;
    commissionPercentage?: string | number | null;
}

export interface CreateUserDto {
    email: string;
    password?: string; // Optional for updates, required for create usually
    firstName: string;
    lastName: string;
    phone?: string;
    roleIds: string[];
    isActive?: boolean;
    commissionPercentage?: number | null;
}

export interface UpdateUserDto extends Partial<CreateUserDto> { }
