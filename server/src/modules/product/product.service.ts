import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ProductPayload = {
  name?: unknown;
  categoryId?: unknown;
  price?: unknown;
  image?: unknown;
  unit?: unknown;
  description?: unknown;
  detailDescription?: unknown;
  detailImages?: unknown;
  specText?: unknown;
  storageText?: unknown;
  status?: unknown;
  stock?: unknown;
  minStock?: unknown;
  makerRate?: unknown;
  deliveryRate?: unknown;
};

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
        take: +pageSize,
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

  async create(data: ProductPayload) {
    const productData = await this.normalizeProductData(data, true);
    return this.prisma.product.create({ data: productData });
  }

  async update(id: number, data: ProductPayload) {
    await this.findOne(id);
    const productData = await this.normalizeProductData(data, false);
    return this.prisma.product.update({ where: { id }, data: productData });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: { status: 0 } });
  }

  private async normalizeProductData(data: ProductPayload, isCreate: boolean) {
    const result: any = {};

    if (isCreate || data.name !== undefined) {
      const name = typeof data.name === 'string' ? data.name.trim() : '';
      if (!name) throw new BadRequestException('请输入商品名称');
      result.name = name;
    }

    if (isCreate || data.categoryId !== undefined) {
      const categoryId = this.parsePositiveInt(data.categoryId, '请选择商品分类');
      const category = await this.prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } });
      if (!category) throw new BadRequestException('商品分类不存在');
      result.categoryId = categoryId;
    }

    if (isCreate || data.price !== undefined) {
      result.price = this.parseNonNegativeNumber(data.price, '请输入有效的商品单价');
    }

    if (data.image !== undefined) result.image = this.parseNullableString(data.image);
    if (data.unit !== undefined) result.unit = this.parseNullableString(data.unit) || '杯';
    if (data.description !== undefined) result.description = this.parseNullableString(data.description);
    if (data.detailDescription !== undefined) result.detailDescription = this.parseNullableString(data.detailDescription);
    if (data.detailImages !== undefined) result.detailImages = this.parseStringArray(data.detailImages);
    if (data.specText !== undefined) result.specText = this.parseNullableString(data.specText);
    if (data.storageText !== undefined) result.storageText = this.parseNullableString(data.storageText);
    if (data.status !== undefined) result.status = this.parseStatus(data.status);
    if (data.stock !== undefined) result.stock = this.parseNonNegativeInt(data.stock, '库存不能小于 0');
    if (data.minStock !== undefined) result.minStock = this.parseNonNegativeInt(data.minStock, '最低库存不能小于 0');
    if (data.makerRate !== undefined) result.makerRate = this.parseNullableNonNegativeNumber(data.makerRate, '制作提成不能小于 0');
    if (data.deliveryRate !== undefined) result.deliveryRate = this.parseNullableNonNegativeNumber(data.deliveryRate, '配送提成不能小于 0');

    return result;
  }

  private parsePositiveInt(value: unknown, message: string) {
    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0) throw new BadRequestException(message);
    return num;
  }

  private parseNonNegativeInt(value: unknown, message: string) {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0) throw new BadRequestException(message);
    return num;
  }

  private parseNonNegativeNumber(value: unknown, message: string) {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) throw new BadRequestException(message);
    return num;
  }

  private parseNullableNonNegativeNumber(value: unknown, message: string) {
    if (value === null || value === undefined || value === '') return null;
    return this.parseNonNegativeNumber(value, message);
  }

  private parseStatus(value: unknown) {
    const status = Number(value);
    if (![0, 1].includes(status)) throw new BadRequestException('商品状态无效');
    return status;
  }

  private parseNullableString(value: unknown) {
    if (value === null || value === undefined) return null;
    return String(value).trim() || null;
  }

  private parseStringArray(value: unknown) {
    if (value === null || value === undefined || value === '') return [];
    const list = Array.isArray(value) ? value : [value];
    return list.map((item) => String(item).trim()).filter(Boolean);
  }
}
