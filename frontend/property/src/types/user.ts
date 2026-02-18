export interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    isActive: boolean;
    idType?: string;
    idNumber?: string;
    roles: { role: { name: string } }[];
    createdAt: string;
}
