export const statusMap: Record<string, string> = {
  pending: '待支付',
  accepted: '待配送',
  making: '制作中',
  made: '待配送',
  delivering: '配送中',
  delivered: '待确认收货',
  completed: '已完成',
  cancelled: '已取消',
}

export const statusColorMap: Record<string, string> = {
  pending: '#E6A23C',
  accepted: '#909399',
  making: '#67C23A',
  made: '#2f8a5a',
  delivering: '#2f8a5a',
  delivered: '#67C23A',
  completed: '#67C23A',
  cancelled: '#F56C6C',
}
