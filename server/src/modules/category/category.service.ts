import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { sort: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('分类不存在');
    return category;
  }

  async create(data: { name: string; sort?: number }) {
    return this.prisma.category.create({ data });
  }

  async update(id: number, data: { name?: string; sort?: number }) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.findOne(id);
    const count = await this.prisma.product.count({ where: { categoryId: id } });
    if (count > 0) throw new NotFoundException('该分类下还有商品，无法删除');
    return this.prisma.category.delete({ where: { id } });
  }
}
