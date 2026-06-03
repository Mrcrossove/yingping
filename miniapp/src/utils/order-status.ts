export const statusMap: Record<string, string> = {
  pending: '待接单',
  accepted: '已接单',
  making: '制作中',
  made: '已制作',
  delivering: '配送中',
  delivered: '已送达',
  completed: '已完成',
  cancelled: '已取消',
}

export const statusColorMap: Record<string, string> = {
  pending: '#E6A23C',
  accepted: '#909399',
  making: '#67C23A',
  made: '#409EFF',
  delivering: '#409EFF',
  delivered: '#67C23A',
  completed: '#67C23A',
  cancelled: '#F56C6C',
}
