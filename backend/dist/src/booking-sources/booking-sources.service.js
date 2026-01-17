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
exports.BookingSourcesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let BookingSourcesService = class BookingSourcesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createDto) {
        return this.prisma.bookingSource.create({
            data: {
                ...createDto,
                commission: createDto.commission ? Number(createDto.commission) : undefined,
            },
        });
    }
    async findAll() {
        return this.prisma.bookingSource.findMany({
            orderBy: { name: 'asc' },
        });
    }
    async findOne(id) {
        const source = await this.prisma.bookingSource.findUnique({
            where: { id },
        });
        if (!source) {
            throw new common_1.NotFoundException(`Booking source with ID ${id} not found`);
        }
        return source;
    }
    async update(id, updateDto) {
        await this.findOne(id);
        return this.prisma.bookingSource.update({
            where: { id },
            data: {
                ...updateDto,
                commission: updateDto.commission !== undefined ? Number(updateDto.commission) : undefined,
            },
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.bookingSource.delete({
            where: { id },
        });
    }
};
exports.BookingSourcesService = BookingSourcesService;
exports.BookingSourcesService = BookingSourcesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BookingSourcesService);
//# sourceMappingURL=booking-sources.service.js.map