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

// 默认的位置
const DEFAULT_DEPOT = {
  address: '110 Torbay Rd, Markham',
  location: { 
    lat: 43.85291,
    lng: -79.33742
  }
}

export const useDriverStore = defineStore('driver', {
  state: () => ({
    allDrivers: [], // 所有司机
    activeDrivers: [], // 在线的司机
    loading: false,
    selectedDriver: null,
  }),
  
  actions: {
    async fetchDrivers() {
      this.loading = true
      try {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 模拟API返回的司机数据（没有status）
        const mockDrivers = [
          { 
            id: 1, 
            name: '张三', 
            phone: '13800138000', 
            color: DRIVER_COLORS[0],
            homeLocation: DEFAULT_DEPOT,
            startLocation: DEFAULT_DEPOT,
            endLocation: DEFAULT_DEPOT
          },
          { 
            id: 2, 
            name: '李四', 
            phone: '13800138001', 
            color: DRIVER_COLORS[1],
            homeLocation: DEFAULT_DEPOT,
            startLocation: DEFAULT_DEPOT,
            endLocation: DEFAULT_DEPOT
          },
          { 
            id: 3, 
            name: '王五', 
            phone: '13800138002', 
            color: DRIVER_COLORS[2],
            homeLocation: DEFAULT_DEPOT,
            startLocation: DEFAULT_DEPOT,
            endLocation: DEFAULT_DEPOT
          },
          { 
            id: 4, 
            name: '赵六', 
            phone: '13800138003', 
            color: DRIVER_COLORS[3],
            homeLocation: DEFAULT_DEPOT,
            startLocation: DEFAULT_DEPOT,
            endLocation: DEFAULT_DEPOT
          },
          { 
            id: 5, 
            name: '钱七', 
            phone: '13800138004', 
            color: DRIVER_COLORS[4],
            homeLocation: DEFAULT_DEPOT,
            startLocation: DEFAULT_DEPOT,
            endLocation: DEFAULT_DEPOT
          }
        ]

        // 从localStorage获取活动状态
        const savedActiveDrivers = localStorage.getItem('activeDrivers')
        const activeDriverIds = savedActiveDrivers ? JSON.parse(savedActiveDrivers) : []

        // 设置所有司机
        this.allDrivers = mockDrivers
        
        // 设置活动司机
        this.activeDrivers = this.allDrivers
          .filter(driver => activeDriverIds.includes(driver.id))
          .map(driver => ({
            ...driver,
            status: '在线'
          }))

      } catch (error) {
        console.error('获取司机列表失败:', error)
      } finally {
        this.loading = false
      }
    },

    // 设置司机状态
    setDriverStatus(driverId, isActive) {
      if (isActive) {
        // 添加到活动司机列表
        const driver = this.allDrivers.find(d => d.id === driverId)
        if (driver && !this.activeDrivers.some(d => d.id === driverId)) {
          this.activeDrivers.push({
            ...driver,
            status: '在线'
          })
        }
      } else {
        // 从活动司机列表中移除
        this.activeDrivers = this.activeDrivers.filter(d => d.id !== driverId)
        // 如果被移除的司机是当前选中的司机，清除选中状态
        if (this.selectedDriver?.id === driverId) {
          this.selectedDriver = null
        }
      }
      
      // 保存活动司机ID到localStorage
      localStorage.setItem(
        'activeDrivers', 
        JSON.stringify(this.activeDrivers.map(d => d.id))
      )
    },

    // 批量更新司机状态
    updateDriverStatuses(activeDriverIds) {
      this.activeDrivers = this.allDrivers
        .filter(driver => activeDriverIds.includes(driver.id))
        .map(driver => ({
          ...driver,
          status: '在线'
        }))
      
      // 保存到localStorage
      localStorage.setItem('activeDrivers', JSON.stringify(activeDriverIds))
      
      // 如果当前选中的司机不在活动列表中，清除选中状态
      if (this.selectedDriver && !activeDriverIds.includes(this.selectedDriver.id)) {
        this.selectedDriver = null
      }
    },
    
    selectDriver(driver) {
      this.selectedDriver = driver
    },
    
    clearSelectedDriver() {
      this.selectedDriver = null
    }
  },

  getters: {
    // 获取所有可用的司机（在线状态）
    availableDrivers: (state) => {
      return state.activeDrivers.length ? state.activeDrivers : []
    }
  }
}) 