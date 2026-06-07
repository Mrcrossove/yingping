import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveAddressDto } from './dto';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: number) {
    return this.prisma.address.findMany({ where: { userId }, orderBy: { isDefault: 'desc' } });
  }

  async create(userId: number, data: SaveAddressDto) {
    const payload = this.normalizeAddressData(data);
    if (payload.isDefault) {
      await this.prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }
    return this.prisma.address.create({ data: { ...payload, userId } });
  }

  async update(id: number, userId: number, data: SaveAddressDto) {
    const addr = await this.prisma.address.findUnique({ where: { id } });
    if (!addr || addr.userId !== userId) throw new NotFoundException('地址不存在');
    const payload = this.normalizeAddressData(data);
    if (payload.isDefault) {
      await this.prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    }
    return this.prisma.address.update({ where: { id }, data: payload });
  }

  async remove(id: number, userId: number) {
    const addr = await this.prisma.address.findUnique({ where: { id } });
    if (!addr || addr.userId !== userId) throw new NotFoundException('地址不存在');
    return this.prisma.address.delete({ where: { id } });
  }

  async setDefault(id: number, userId: number) {
    const addr = await this.prisma.address.findUnique({ where: { id } });
    if (!addr || addr.userId !== userId) throw new NotFoundException('地址不存在');
    await this.prisma.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
    return this.prisma.address.update({ where: { id }, data: { isDefault: true } });
  }

  private normalizeAddressData(data: SaveAddressDto) {
    return {
      name: data.name.trim(),
      phone: data.phone.trim(),
      province: data.province?.trim() || null,
      city: data.city?.trim() || null,
      district: data.district?.trim() || null,
      detail: data.detail.trim(),
      locationName: data.locationName?.trim() || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      adcode: data.adcode?.trim() || null,
      isDefault: Boolean(data.isDefault),
    };
  }
}
