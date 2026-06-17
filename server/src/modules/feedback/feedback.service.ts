import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FeedbackCategory, FeedbackStatus } from '@prisma/client';

type FeedbackQuery = {
  page?: number;
  pageSize?: number;
  status?: FeedbackStatus;
  category?: FeedbackCategory;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  userId?: number;
};

@Injectable()
export class FeedbackService {
  private readonly categories: FeedbackCategory[] = ['suggestion', 'product', 'service', 'system', 'other'];
  private readonly statuses: FeedbackStatus[] = ['pending', 'processing', 'resolved', 'rejected'];

  constructor(private prisma: PrismaService) {}

  async create(userId: number, data: { category?: FeedbackCategory; title: string; content: string; contactPhone?: string }) {
    const title = (data.title || '').trim();
    const content = (data.content || '').trim();
    if (!title) throw new BadRequestException('请填写反馈标题');
    if (!content) throw new BadRequestException('请填写反馈内容');
    if (title.length > 100) throw new BadRequestException('标题不能超过100字');
    if (data.contactPhone && data.contactPhone.length > 20) throw new BadRequestException('联系电话不能超过20位');
    if (data.category && !this.categories.includes(data.category)) throw new BadRequestException('反馈分类不正确');

    return this.prisma.feedback.create({
      data: {
        userId,
        category: data.category || 'suggestion',
        title,
        content,
        contactPhone: data.contactPhone?.trim() || null,
      },
    });
  }

  async findMyFeedback(userId: number, query: Pick<FeedbackQuery, 'page' | 'pageSize' | 'status' | 'category'>) {
    const { page = 1, pageSize = 20, status, category } = query;
    const where: any = { userId };
    if (status && !this.statuses.includes(status)) throw new BadRequestException('反馈状态不正确');
    if (category && !this.categories.includes(category)) throw new BadRequestException('反馈分类不正确');
    if (status) where.status = status;
    if (category) where.category = category;

    const [list, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: +pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async findAll(query: FeedbackQuery) {
    const { page = 1, pageSize = 20, status, category, keyword, startDate, endDate, userId } = query;
    const where: any = {};
    if (status && !this.statuses.includes(status)) throw new BadRequestException('反馈状态不正确');
    if (category && !this.categories.includes(category)) throw new BadRequestException('反馈分类不正确');
    if (status) where.status = status;
    if (category) where.category = category;
    if (userId) where.userId = userId;
    if (keyword?.trim()) {
      where.OR = [
        { title: { contains: keyword.trim() } },
        { content: { contains: keyword.trim() } },
        { contactPhone: { contains: keyword.trim() } },
        { merchant: { realName: { contains: keyword.trim() } } },
        { merchant: { phone: { contains: keyword.trim() } } },
      ];
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const date = new Date(endDate);
        date.setHours(23, 59, 59, 999);
        where.createdAt.lte = date;
      }
    }

    const [list, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: +pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          merchant: {
            select: { id: true, realName: true, phone: true, role: true, merchantProfile: { select: { shopName: true } } },
          },
        },
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  async updateStatus(id: number, operatorId: number, data: { status: FeedbackStatus; reply?: string }) {
    const feedback = await this.prisma.feedback.findUnique({ where: { id } });
    if (!feedback) throw new NotFoundException('反馈不存在');
    if (!this.statuses.includes(data.status)) throw new BadRequestException('反馈状态不正确');
    const reply = data.reply?.trim() || null;
    if (reply && reply.length > 2000) throw new BadRequestException('回复内容过长');

    return this.prisma.feedback.update({
      where: { id },
      data: {
        status: data.status,
        reply,
        processedById: operatorId,
        processedAt: new Date(),
      },
    });
  }
}
