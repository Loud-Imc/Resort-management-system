"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let RolesService = class RolesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createRoleDto) {
        const { permissions, ...roleData } = createRoleDto;
        let permissionConnect = [];
        if (permissions && permissions.length > 0) {
            const permissionRecords = await this.prisma.permission.findMany({
                where: { name: { in: permissions } },
            });
            permissionConnect = permissionRecords.map(p => ({
                permission: { connect: { id: p.id } }
            }));
        }
        return this.prisma.role.create({
            data: {
                ...roleData,
                permissions: {
                    create: permissionConnect.map(p => ({
                        permission: { connect: { id: p.permission.connect.id } }
                    }))
                },
            },
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
    }
    async findAll() {
        return this.prisma.role.findMany({
            orderBy: { name: 'asc' },
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                },
                _count: {
                    select: { users: true }
                }
            }
        });
    }
    async findOne(id) {
        const role = await this.prisma.role.findUnique({
            where: { id },
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
        if (!role)
            throw new common_1.NotFoundException(`Role with ID ${id} not found`);
        return {
            ...role,
            permissions: role.permissions.map(p => p.permission.name)
        };
    }
    async update(id, updateRoleDto) {
        const { permissions, ...roleData } = updateRoleDto;
        const role = await this.prisma.role.findUnique({ where: { id } });
        if (!role)
            throw new common_1.NotFoundException(`Role with ID ${id} not found`);
        const updateData = { ...roleData };
        if (permissions) {
            await this.prisma.rolePermission.deleteMany({
                where: { roleId: id }
            });
            const permissionRecords = await this.prisma.permission.findMany({
                where: { name: { in: permissions } },
            });
            updateData.permissions = {
                deleteMany: {},
                create: permissionRecords.map(p => ({
                    permission: { connect: { id: p.id } }
                }))
            };
        }
        return this.prisma.role.update({
            where: { id },
            data: updateData,
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
    }
    async remove(id) {
        const role = await this.prisma.role.findUnique({ where: { id } });
        if (!role)
            throw new common_1.NotFoundException(`Role with ID ${id} not found`);
        const userCount = await this.prisma.userRole.count({ where: { roleId: id } });
        if (userCount > 0) {
        }
        return this.prisma.role.delete({
            where: { id },
        });
    }
    async findAllPermissions() {
        return this.prisma.permission.findMany({
            orderBy: [
                { module: 'asc' },
                { name: 'asc' },
            ],
        });
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RolesService);
//# sourceMappingURL=roles.service.js.map