import { defineStore } from 'pinia'
import { useDriverStore } from './driver'

// 初始订单数据
const initialOrders = [
  {
    id: 1,
    customerName: 'Vicky',
    address: '220 Yonge St, Toronto, ON M5B 2H1, Canada',
    location: { lat: 43.6544, lng: -79.3807 },
    status: 'pending',
    createTime: '2024-03-15 10:00:00',
    stopNumber: null,
    driverId: null,
    driverColor: null
  },
  {
    id: 2,
    customerName: 'Kerry Zhang',
    address: '290 Bremner Blvd, Toronto, ON M5V 3L9, Canada',
    location: { lat: 43.6425, lng: -79.3892 },
    status: 'pending',
    createTime: '2024-03-15 10:05:00',
    stopNumber: null,
    driverId: null,
    driverColor: null
  },
  {
    id: 3,
    customerName: 'Arthur Li',
    address: '100 Queens Park, Toronto, ON M5S 2C6, Canada',
    location: { lat: 43.6677, lng: -79.3947 },
    status: 'pending',
    createTime: '2024-03-15 10:10:00',
    stopNumber: null,
    driverId: null,
    driverColor: null
  },
  {
    id: 4,
    customerName: 'Zoe',
    address: '789 Yonge St, Toronto, ON M4W 2G8, Canada',
    location: { lat: 43.6709, lng: -79.3857 },
    status: 'pending',
    createTime: '2024-03-15 10:15:00',
    stopNumber: null,
    driverId: null,
    driverColor: null
  },
  {
    id: 5,
    customerName: 'Mike Wang',
    address: '55 Mill St, Toronto, ON M5A 3C4, Canada',
    location: { lat: 43.6501, lng: -79.3591 },
    status: 'pending',
    createTime: '2024-03-15 10:20:00',
    stopNumber: null,
    driverId: null,
    driverColor: null
  }
]

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [],
    loading: false,
    selectedOrder: null
  }),

  actions: {
    async fetchOrders() {
      console.log('开始获取订单数据')
      this.loading = true
      try {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // 从 localStorage 获取数据，如果没有则使用初始数据
        const savedOrders = localStorage.getItem('orders')
        const mockOrders = savedOrders ? JSON.parse(savedOrders) : initialOrders

        console.log('设置订单数据:', mockOrders)
        this.orders = mockOrders
      } catch (error) {
        console.error('获取订单列表失败:', error)
      } finally {
        this.loading = false
      }
    },

    // 保存数据到 localStorage
    saveOrders() {
      localStorage.setItem('orders', JSON.stringify(this.orders))
    },

    selectOrder(order) {
      this.selectedOrder = order
    },

    clearSelectedOrder() {
      this.selectedOrder = null
    },

    async assignOrder(orderId, driverId) {
      console.log('开始分配订单:', orderId, '给司机:', driverId)
      
      const order = this.orders.find(o => o.id === orderId)
      const driverStore = useDriverStore()
      const driver = driverStore.drivers.find(d => d.id === driverId)
      
      if (order && driver) {
        // 获取该司机当前的订单数量作为新订单的序号
        const driverOrders = this.orders.filter(o => o.driverId === driverId)
        const stopNumber = driverOrders.length + 1

        // 直接修改原始订单数据
        order.status = 'assigned'
        order.driverId = driverId
        order.driverColor = driver.color
        order.stopNumber = stopNumber
        order.orderIndex = stopNumber

        // 保存更新后的数据
        this.saveOrders()

        console.log('更新后的订单:', order)
        return order
      }
    },

    async updateOrderIndexes(updates) {
      updates.forEach(({ orderId, newIndex }) => {
        const order = this.orders.find(o => o.id === orderId)
        if (order) {
          order.stopNumber = newIndex
          order.orderIndex = newIndex
        }
      })
      
      // 保存更新后的数据
      this.saveOrders()
    },

    async unassignOrder(orderId) {
      console.log('开始取消分配订单:', orderId)
      
      const order = this.orders.find(o => o.id === orderId)
      if (order) {
        const driverId = order.driverId
        const stopNumber = order.stopNumber

        // 直接修改原始订单数据
        order.status = 'pending'
        order.driverId = null
        order.driverColor = null
        order.stopNumber = null
        order.orderIndex = null

        // 更新同一司机的其他订单序号
        this.orders.forEach(o => {
          if (o.driverId === driverId && o.stopNumber > stopNumber) {
            o.stopNumber--
            o.orderIndex = o.stopNumber
          }
        })

        // 保存更新后的数据
        this.saveOrders()

        console.log('更新后的订单:', order)
        return order
      }
    }
  },

  getters: {
    pendingOrders: (state) => {
      return state.orders.filter(order => order.status === 'pending')
    },
    
    assignedOrders: (state) => {
      return state.orders.filter(order => order.status === 'assigned')
    },

    // 获取司机的订单列表（按 stopNumber 排序）
    getDriverOrders: (state) => (driverId) => {
      return state.orders
        .filter(order => order.driverId === driverId)
        .sort((a, b) => a.stopNumber - b.stopNumber)
    }
  }
}) 