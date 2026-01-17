export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions?: unknown[];
}

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    isActive: boolean;
    roles: { role: Role }[];
    lastLogin?: string;
}

export interface CreateUserDto {
    email: string;
    password?: string; // Optional for updates, required for create usually
    firstName: string;
    lastName: string;
    phone?: string;
    roleIds: string[];
    isActive?: boolean;
}

export interface UpdateUserDto extends Partial<CreateUserDto> { }
