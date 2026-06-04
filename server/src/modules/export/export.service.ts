import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async exportOrders(res: Response, query: { startDate?: string; endDate?: string; status?: string; keyword?: string }) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.keyword) where.orderNo = { contains: query.keyword };
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate + 'T23:59:59');
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: { include: { product: true } },
        merchant: { select: { realName: true, phone: true } },
        salesperson: { select: { realName: true } },
        maker: { select: { realName: true } },
        delivery: { select: { realName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('订单数据');

    sheet.columns = [
      { header: '订单编号', key: 'orderNo', width: 20 },
      { header: '商户', key: 'merchant', width: 15 },
      { header: '商品', key: 'product', width: 20 },
      { header: '数量', key: 'quantity', width: 10 },
      { header: '单价', key: 'price', width: 10 },
      { header: '总金额', key: 'totalAmount', width: 12 },
      { header: '状态', key: 'status', width: 12 },
      { header: '业务员', key: 'salesperson', width: 12 },
      { header: '制作员', key: 'maker', width: 12 },
      { header: '配送员', key: 'delivery', width: 12 },
      { header: '下单时间', key: 'createdAt', width: 20 },
    ];

    for (const order of orders) {
      for (const item of order.items) {
        sheet.addRow({
          orderNo: order.orderNo,
          merchant: order.merchant?.realName,
          product: item.product.name,
          quantity: item.quantity,
          price: Number(item.price),
          totalAmount: Number(order.totalAmount),
          status: order.status,
          salesperson: order.salesperson?.realName,
          maker: order.maker?.realName,
          delivery: order.delivery?.realName,
          createdAt: order.createdAt.toLocaleString(),
        });
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }

  async exportEarnings(res: Response, query: { role?: string; userId?: string; status?: string; keyword?: string; startDate?: string; endDate?: string }) {
    const where: any = {};
    if (query.role) where.role = query.role;
    if (query.userId) where.userId = +query.userId;
    if (query.status) where.status = query.status;
    if (query.keyword) where.orderNo = { contains: query.keyword };
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate + 'T23:59:59');
    }
    const earnings = await this.prisma.earning.findMany({
      where,
      include: { user: { select: { realName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('收益数据');

    sheet.columns = [
      { header: '订单号', key: 'orderNo', width: 20 },
      { header: '用户', key: 'user', width: 15 },
      { header: '角色', key: 'role', width: 12 },
      { header: '金额', key: 'amount', width: 12 },
      { header: '状态', key: 'status', width: 12 },
      { header: '时间', key: 'createdAt', width: 20 },
    ];

    for (const e of earnings) {
      sheet.addRow({
        orderNo: e.orderNo,
        user: e.user.realName,
        role: e.role,
        amount: Number(e.amount),
        status: e.status,
        createdAt: e.createdAt.toLocaleString(),
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=earnings.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }

  async exportWithdrawals(res: Response) {
    const withdrawals = await this.prisma.withdrawal.findMany({
      include: { user: { select: { realName: true, role: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('提现数据');

    sheet.columns = [
      { header: '用户', key: 'user', width: 15 },
      { header: '角色', key: 'role', width: 12 },
      { header: '手机号', key: 'phone', width: 15 },
      { header: '金额', key: 'amount', width: 12 },
      { header: '账户类型', key: 'accountType', width: 12 },
      { header: '账户信息', key: 'accountInfo', width: 20 },
      { header: '状态', key: 'status', width: 12 },
      { header: '申请时间', key: 'createdAt', width: 20 },
      { header: '处理时间', key: 'processedAt', width: 20 },
    ];

    for (const w of withdrawals) {
      sheet.addRow({
        user: w.user.realName,
        role: w.user.role,
        phone: w.user.phone || '',
        amount: Number(w.amount),
        accountType: w.accountType,
        accountInfo: w.accountInfo,
        status: w.status,
        createdAt: w.createdAt.toLocaleString(),
        processedAt: w.processedAt?.toLocaleString() || '',
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=withdrawals.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  }
}
