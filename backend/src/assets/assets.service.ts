import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PdfService } from '../pdf/pdf.service';
import { AssetOwnership, AssetCondition } from '@prisma/client';

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService
  ) {}

  async create(data: any) {
    return this.prisma.asset.create({
      data: {
        propertyId: data.propertyId,
        roomId: data.roomId || null,
        name: data.name,
        category: data.category,
        ownership: data.ownership,
        quantity: data.quantity || 1,
        condition: data.condition || 'GOOD',
        location: data.location || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        value: data.value ? Number(data.value) : null,
        notes: data.notes || null,
        billUrl: data.billUrl || null,
        images: data.images || [],
      },
    });
  }

  async findAll(params: {
    propertyId: string;
    ownership?: AssetOwnership;
    condition?: AssetCondition;
    categoryId?: string;
  }) {
    const { propertyId, ownership, condition, categoryId } = params;
    
    if (!propertyId) {
      return [];
    }

    return this.prisma.asset.findMany({
      where: {
        propertyId,
        ...(ownership && { ownership }),
        ...(condition && { condition }),
        ...(categoryId && { category: categoryId }),
      },
      include: {
        room: {
          select: {
            id: true,
            roomNumber: true,
            roomType: {
              select: {
                name: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id },
      include: {
        room: {
          select: {
            id: true,
            roomNumber: true,
          }
        }
      }
    });
    
    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }
    
    return asset;
  }

  async update(id: string, data: any) {
    await this.findOne(id); // Check existence
    
    return this.prisma.asset.update({
      where: { id },
      data: {
        roomId: data.roomId !== undefined ? data.roomId : undefined,
        name: data.name,
        category: data.category,
        ownership: data.ownership,
        quantity: data.quantity,
        condition: data.condition,
        location: data.location,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : (data.purchaseDate === null ? null : undefined),
        value: data.value !== undefined ? (data.value === null ? null : Number(data.value)) : undefined,
        notes: data.notes,
        billUrl: data.billUrl,
        images: data.images,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.asset.delete({
      where: { id },
    });
  }

  async generatePdfReport(filters: any): Promise<Buffer> {
    const assets = await this.findAll(filters);
    return this.pdfService.generateAssetsReport(assets, filters);
  }
}
