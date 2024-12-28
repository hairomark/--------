import { defineStore } from 'pinia'

// 预定义一些颜色
const DRIVER_COLORS = [
  '#FF6B6B', // 红色
  '#4ECDC4', // 青色
  '#45B7D1', // 蓝色
  '#96CEB4', // 绿色
  '#FFEEAD', // 黄色
  '#D4A5A5', // 粉色
  '#9B59B6', // 紫色
  '#3498DB', // 深蓝
  '#E67E22', // 橙色
  '#2ECC71'  // 深绿
]

export const useDriverStore = defineStore('driver', {
  state: () => ({
    drivers: [],
    loading: false,
    selectedDriver: null,
  }),
  
  actions: {
    async fetchDrivers() {
      this.loading = true
      try {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 模拟更多的司机数据
        const mockDrivers = [
          { 
            id: 1, 
            name: '张三', 
            phone: '13800138000', 
            status: '在线',
            color: DRIVER_COLORS[0],
            location: { lat: 43.6532, lng: -79.3832 }
          },
          { 
            id: 2, 
            name: '李四', 
            phone: '13800138001', 
            status: '离线',
            color: DRIVER_COLORS[1],
            location: { lat: 43.6632, lng: -79.3932 }
          },
          { 
            id: 3, 
            name: '王五', 
            phone: '13800138002', 
            status: '在线',
            color: DRIVER_COLORS[2],
            location: { lat: 43.6732, lng: -79.3732 }
          },
          { 
            id: 4, 
            name: '赵六', 
            phone: '13800138003', 
            status: '在线',
            color: DRIVER_COLORS[3],
            location: { lat: 43.6832, lng: -79.3632 }
          },
          { 
            id: 5, 
            name: '钱七', 
            phone: '13800138004', 
            status: '离线',
            color: DRIVER_COLORS[4],
            location: { lat: 43.6932, lng: -79.3532 }
          }
        ]
        this.drivers = mockDrivers
      } catch (error) {
        console.error('获取司机列表失败:', error)
      } finally {
        this.loading = false
      }
    },
    
    async addDriver(driver) {
      this.drivers.push({
        id: this.drivers.length + 1,
        ...driver
      })
    },
    
    async updateDriver(id, updates) {
      const index = this.drivers.findIndex(d => d.id === id)
      if (index !== -1) {
        this.drivers[index] = { ...this.drivers[index], ...updates }
      }
    },
    
    async deleteDriver(id) {
      this.drivers = this.drivers.filter(d => d.id !== id)
    },
    
    selectDriver(driver) {
      this.selectedDriver = driver
    },
    
    clearSelectedDriver() {
      this.selectedDriver = null
    }
  }
}) 