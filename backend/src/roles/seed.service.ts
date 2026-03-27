import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS } from '../auth/constants/permissions.constant';

@Injectable()
export class SeedService implements OnModuleInit {
    private readonly logger = new Logger(SeedService.name);

    constructor(private readonly prisma: PrismaService) { }

    async onModuleInit() {
        this.logger.log('🌱 Synchronizing RBAC permissions...');
        try {
            await this.syncPermissions();
            this.logger.log('✅ RBAC permissions synchronization complete');
        } catch (error) {
            this.logger.error('❌ Failed to sync RBAC permissions', error.stack);
        }
    }

    private async syncPermissions() {
        // 1. Collect all permissions from constants
        const allPermissions: string[] = [];
        for (const modulePermissions of Object.values(PERMISSIONS)) {
            for (const permissionName of Object.values(modulePermissions)) {
                allPermissions.push(permissionName);
            }
        }

        // 2. Clear existing permissions (optional, but ensures source of truth is the code)
        // Or simply upsert all of them
        for (const name of allPermissions) {
            await this.prisma.permission.upsert({
                where: { name },
                update: {}, // No change if exists
                create: {
                    name,
                    module: name.split('.')[0] || 'system',
                },
            });
        }

        // 3. Ensure SuperAdmin role exists
        let superAdminRole = await this.prisma.role.findFirst({
            where: { name: 'SuperAdmin', propertyId: null },
        });

        if (!superAdminRole) {
            superAdminRole = await this.prisma.role.create({
                data: {
                    name: 'SuperAdmin',
                    isSystem: true,
                    description: 'Full System Access',
                    propertyId: null,
                },
            });
        } else if (!superAdminRole.isSystem) {
            superAdminRole = await this.prisma.role.update({
                where: { id: superAdminRole.id },
                data: { isSystem: true },
            });
        }

        // 4. Assign ALL permissions to SuperAdmin
        const dbPermissions = await this.prisma.permission.findMany();

        for (const permission of dbPermissions) {
            await this.prisma.rolePermission.upsert({
                where: {
                    roleId_permissionId: {
                        roleId: superAdminRole.id,
                        permissionId: permission.id,
                    },
                },
                update: {},
                create: {
                    roleId: superAdminRole.id,
                    permissionId: permission.id,
                },
            });
        }

        this.logger.log(`✅ SuperAdmin role synchronized with ${dbPermissions.length} permissions`);
    }
}
