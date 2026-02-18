export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    roles: string[];
    permissions: string[];
    commissionPercentage?: number;
}

export interface AuthResponse {
    accessToken: string;
    user: User;
}

export interface LoginCredentials {
    email: string;
    password: string;
}
