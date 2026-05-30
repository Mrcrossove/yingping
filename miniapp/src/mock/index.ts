// Mock 数据 —— 开发阶段占位，后续替换为真实 API

export interface Product {
  id: number
  name: string
  categoryId: number
  categoryName: string
  image: string
  price: number
  unit: string
  spec: string
  tierPrices: { minQty: number; price: number }[]
  minOrderQty: number
  stock: number
  description: string
}

export interface Category {
  id: number
  name: string
  icon: string
}

export interface Order {
  id: number
  orderNo: string
  status: string
  merchantName: string
  merchantPhone: string
  address: string
  items: { name: string; spec: string; quantity: number; price: number }[]
  totalAmount: number
  note: string
  salespersonName: string
  makerName: string
  deliveryName: string
  createdAt: string
  commission?: number
}

export const mockCategories: Category[] = [
  { id: 1, name: '热销爆款', icon: '🔥' },
  { id: 2, name: '茶饮原料', icon: '🍵' },
  { id: 3, name: '果汁浓缩液', icon: '🧃' },
  { id: 4, name: '乳制品', icon: '🥛' },
  { id: 5, name: '包装耗材', icon: '📦' },
  { id: 6, name: '糖浆果酱', icon: '🍯' },
]

export const mockProducts: Product[] = [
  {
    id: 1, name: '四季春茶底浓缩液', categoryId: 2, categoryName: '茶饮原料',
    image: '', price: 85, unit: '箱', spec: '5L×4桶/箱',
    tierPrices: [{ minQty: 1, price: 85 }, { minQty: 10, price: 78 }, { minQty: 50, price: 72 }],
    minOrderQty: 1, stock: 500, description: '精选台湾四季春茶叶萃取，1:8稀释',
  },
  {
    id: 2, name: '蜜桃果汁浓缩液', categoryId: 3, categoryName: '果汁浓缩液',
    image: '', price: 120, unit: '箱', spec: '2L×6瓶/箱',
    tierPrices: [{ minQty: 1, price: 120 }, { minQty: 20, price: 108 }, { minQty: 100, price: 96 }],
    minOrderQty: 2, stock: 320, description: '鲜蜜桃原浆 ≥35%，1:5稀释',
  },
  {
    id: 3, name: '奶盖粉（芝士味）', categoryId: 4, categoryName: '乳制品',
    image: '', price: 65, unit: '袋', spec: '1kg/袋',
    tierPrices: [{ minQty: 1, price: 65 }, { minQty: 30, price: 58 }, { minQty: 100, price: 52 }],
    minOrderQty: 5, stock: 800, description: '进口芝士粉调制，奶香浓郁',
  },
  {
    id: 4, name: '百香果糖浆', categoryId: 6, categoryName: '糖浆果酱',
    image: '', price: 45, unit: '瓶', spec: '1.2kg/瓶',
    tierPrices: [{ minQty: 1, price: 45 }, { minQty: 24, price: 40 }, { minQty: 100, price: 36 }],
    minOrderQty: 6, stock: 600, description: '百香果原汁含量≥50%',
  },
  {
    id: 5, name: '700ml注塑杯+平盖', categoryId: 5, categoryName: '包装耗材',
    image: '', price: 28, unit: '箱', spec: '500个/箱',
    tierPrices: [{ minQty: 1, price: 28 }, { minQty: 50, price: 25 }, { minQty: 200, price: 22 }],
    minOrderQty: 10, stock: 2000, description: 'PP注塑杯，耐温-20~120℃',
  },
  {
    id: 6, name: '椰果粒（原味）', categoryId: 6, categoryName: '糖浆果酱',
    image: '', price: 38, unit: '箱', spec: '3kg×2袋/箱',
    tierPrices: [{ minQty: 1, price: 38 }, { minQty: 20, price: 34 }, { minQty: 100, price: 30 }],
    minOrderQty: 3, stock: 450, description: '泰国进口椰果，Q弹爽滑',
  },
  {
    id: 7, name: '锡兰红茶底浓缩液', categoryId: 2, categoryName: '茶饮原料',
    image: '', price: 90, unit: '箱', spec: '5L×4桶/箱',
    tierPrices: [{ minQty: 1, price: 90 }, { minQty: 10, price: 82 }, { minQty: 50, price: 75 }],
    minOrderQty: 1, stock: 380, description: '斯里兰卡进口锡兰红茶，1:8稀释',
  },
  {
    id: 8, name: '粗吸管（独立包装）', categoryId: 5, categoryName: '包装耗材',
    image: '', price: 18, unit: '箱', spec: '2000支/箱',
    tierPrices: [{ minQty: 1, price: 18 }, { minQty: 100, price: 15 }, { minQty: 500, price: 13 }],
    minOrderQty: 20, stock: 5000, description: '食品级PP，单支独立包装',
  },
]

export const mockOrders: Order[] = [
  {
    id: 1001, orderNo: 'BO20260530001', status: 'pending',
    merchantName: '喜茶（万达店）', merchantPhone: '13800138001', address: '万达广场3F-018',
    items: [{ name: '蜜桃果汁浓缩液', spec: '2L×6瓶/箱', quantity: 15, price: 108 },
           { name: '四季春茶底浓缩液', spec: '5L×4桶/箱', quantity: 20, price: 78 }],
    totalAmount: 3180, note: '急单，下午3点前到货',
    salespersonName: '', makerName: '', deliveryName: '',
    createdAt: '2026-05-30 10:30', commission: 95.4,
  },
  {
    id: 1002, orderNo: 'BO20260530002', status: 'making',
    merchantName: '奈雪的茶（万象城店）', merchantPhone: '13800138002', address: '万象城B1-022',
    items: [{ name: '奶盖粉（芝士味）', spec: '1kg/袋', quantity: 30, price: 58 },
           { name: '百香果糖浆', spec: '1.2kg/瓶', quantity: 24, price: 40 }],
    totalAmount: 2700, note: '',
    salespersonName: '张伟', makerName: '李强', deliveryName: '',
    createdAt: '2026-05-30 09:15',
  },
  {
    id: 1003, orderNo: 'BO20260530003', status: 'delivering',
    merchantName: '蜜雪冰城（大学城店）', merchantPhone: '13800138003', address: '大学城商业街A12',
    items: [{ name: '700ml注塑杯+平盖', spec: '500个/箱', quantity: 50, price: 25 },
           { name: '粗吸管（独立包装）', spec: '2000支/箱', quantity: 100, price: 15 }],
    totalAmount: 2750, note: '放仓库门口即可',
    salespersonName: '张伟', makerName: '李强', deliveryName: '王磊',
    createdAt: '2026-05-29 16:00',
  },
  {
    id: 1004, orderNo: 'BO20260529004', status: 'delivered',
    merchantName: '茶颜悦色（解放路店）', merchantPhone: '13800138004', address: '解放路128号',
    items: [{ name: '锡兰红茶底浓缩液', spec: '5L×4桶/箱', quantity: 30, price: 82 },
           { name: '椰果粒（原味）', spec: '3kg×2袋/箱', quantity: 20, price: 34 }],
    totalAmount: 3140, note: '',
    salespersonName: '张伟', makerName: '赵刚', deliveryName: '王磊',
    createdAt: '2026-05-29 14:00', commission: 125.6,
  },
]

export const mockUser = {
  id: 1,
  realName: '张伟',
  role: 'salesperson',
  phone: '13800001234',
  avatar: '',
  earnings: { pending: 2580.5, withdrawn: 12300 },
  customerCount: 47,
  todayOrders: 8,
}

export const statusMap: Record<string, string> = {
  pending: '待接单', accepted: '已接单', making: '制作中',
  made: '已制作', delivering: '配送中', delivered: '已完成', cancelled: '已取消',
}

export const statusColorMap: Record<string, string> = {
  pending: '#E6A23C', accepted: '#409EFF', making: '#67C23A',
  made: '#909399', delivering: '#409EFF', delivered: '#67C23A', cancelled: '#F56C6C',
}

export const roleLabelMap: Record<string, string> = {
  boss: '老板', admin: '管理员', salesperson: '业务员',
  maker: '制作员', delivery: '配送员', promoter: '推广员', merchant: '商户',
}
