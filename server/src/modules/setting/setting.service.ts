import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CUSTOMER_SERVICE_PHONE_KEY = 'customerServicePhone';

@Injectable()
export class SettingService {
  constructor(private prisma: PrismaService) {}

  async getPublicSettings() {
    const customerServicePhone = await this.getValue(CUSTOMER_SERVICE_PHONE_KEY);
    return { customerServicePhone: customerServicePhone || '' };
  }

  async getAdminSettings() {
    return this.getPublicSettings();
  }

  async updateCustomerServicePhone(phone: string) {
    const value = (phone || '').trim();
    if (value && !/^1\d{10}$/.test(value) && !/^\d{3,4}-?\d{7,8}$/.test(value)) {
      throw new BadRequestException('客服电话格式不正确');
    }

    await this.prisma.systemSetting.upsert({
      where: { key: CUSTOMER_SERVICE_PHONE_KEY },
      update: { value },
      create: {
        key: CUSTOMER_SERVICE_PHONE_KEY,
        value,
        description: '小程序订单联系业务员兜底客服电话',
      },
    });

    return this.getAdminSettings();
  }

  private async getValue(key: string) {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    return setting?.value || '';
  }
}

