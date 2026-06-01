import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: number) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
  }

  async create(userId: number, data: { name: string; phone: string; province?: string; city?: string; district?: string; detail: string; isDefault?: boolean }) {
    if (data.isDefault) {
      await this.prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }
    return this.prisma.address.create({ data: { ...data, userId } });
  }

  async update(id: number, userId: number, data: any) {
    const addr = await this.prisma.address.findUnique({ where: { id } });
    if (!addr || addr.userId !== userId) throw new NotFoundException('地址不存在');
    if (data.isDefault) {
      await this.prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }
    return this.prisma.address.update({ where: { id }, data });
  }

  async remove(id: number, userId: number) {
    const addr = await this.prisma.address.findUnique({ where: { id } });
    if (!addr || addr.userId !== userId) throw new NotFoundException('地址不存在');
    return this.prisma.address.delete({ where: { id } });
  }

  async setDefault(id: number, userId: number) {
    await this.prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    return this.prisma.address.update({ where: { id }, data: { isDefault: true } });
  }
}
