import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
export declare class RolesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createRoleDto: CreateRoleDto): Promise<{
        permissions: ({
            permission: {
                id: string;
                name: string;
                description: string | null;
                createdAt: Date;
                module: string;
            };
        } & {
            roleId: string;
            permissionId: string;
            assignedAt: Date;
        })[];
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): Promise<({
        permissions: ({
            permission: {
                id: string;
                name: string;
                description: string | null;
                createdAt: Date;
                module: string;
            };
        } & {
            roleId: string;
            permissionId: string;
            assignedAt: Date;
        })[];
        _count: {
            users: number;
        };
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    findOne(id: string): Promise<{
        permissions: string[];
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, updateRoleDto: UpdateRoleDto): Promise<{
        permissions: ({
            permission: {
                id: string;
                name: string;
                description: string | null;
                createdAt: Date;
                module: string;
            };
        } & {
            roleId: string;
            permissionId: string;
            assignedAt: Date;
        })[];
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAllPermissions(): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        module: string;
    }[]>;
}
