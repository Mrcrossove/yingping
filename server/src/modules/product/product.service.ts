import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: { page?: number; pageSize?: number; categoryId?: number; keyword?: string; status?: number }) {
    const { page = 1, pageSize = 20, categoryId, keyword, status } = query;
    const where: any = {};
    if (categoryId) where.categoryId = +categoryId;
    if (keyword) where.name = { contains: keyword };
    if (status !== undefined) where.status = +status;

    const [list, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { list, total, page, pageSize };
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!product) throw new NotFoundException('商品不存在');
    return product;
  }

  async create(data: { name: string; categoryId: number; price: number; image?: string; unit?: string; description?: string }) {
    return this.prisma.product.create({ data });
  }

  async update(id: number, data: any) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: { status: 0 } });
  }
}
