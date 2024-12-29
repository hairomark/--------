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
    orders: initialOrders,
    selectedOrder: null,
    selectedOrderIds: new Set()  // 添加选中订单ID集合
  }),

  getters: {
    // 获取所有订单
    allOrders: (state) => {
      return state.orders || []
    },

    // 获取待分配的订单
    pendingOrders: (state) => {
      return (state.orders || []).filter(order => order.status === 'pending')
    },

    // 获取指定司机的订单
    getDriverOrders: (state) => (driverId) => {
      return state.orders
        .filter(order => 
          order.status === 'assigned' && order.driverId === driverId
        )
        .sort((a, b) => (a.stopNumber || 0) - (b.stopNumber || 0))  // 按 stopNumber 排序
    },

    // 获取选中的订单列表
    selectedOrders: (state) => {
      return state.orders.filter(order => state.selectedOrderIds.has(order.id))
    }
  },

  actions: {
    // 分配订单给司机
    async assignOrder(orderId, driverId, routeNumber = null, stopNumber = null) {
      try {
        // 找到要分配的订单
        const orderIndex = this.orders.findIndex(o => o.id === orderId)
        if (orderIndex === -1) return

        // 获取司机信息以获取颜色
        const driverStore = useDriverStore()
        const driver = driverStore.allDrivers.find(d => d.id === driverId)
        if (!driver) return

        // 如果没有提供 stopNumber，则计算新的 stopNumber
        let newStopNumber = stopNumber
        if (newStopNumber === null) {
          const driverOrders = this.orders.filter(order => 
            order.status === 'assigned' && 
            order.driverId === driverId
          )
          const maxStopNumber = driverOrders.reduce((max, order) => 
            Math.max(max, order.stopNumber || 0), 0
          )
          newStopNumber = maxStopNumber + 1
        }

        // 更新订单状态
        this.orders[orderIndex] = {
          ...this.orders[orderIndex],
          status: 'assigned',
          driverId: driverId,
          driverColor: driver.color,
          routeNumber: routeNumber,
          stopNumber: newStopNumber
        }

        // 这里应该有后端 API 调用
        // await api.assignOrder(orderId, driverId)
      } catch (error) {
        console.error('分配订单失败:', error)
        throw error
      }
    },

    // 取消分配订单
    async unassignOrder(orderId) {
      try {
        // 找到要取消分配的订单
        const orderIndex = this.orders.findIndex(o => o.id === orderId)
        if (orderIndex === -1) return

        // 更新订单状态
        this.orders[orderIndex] = {
          ...this.orders[orderIndex],
          status: 'pending',
          driverId: null,
          driverColor: null,  // 清除司机颜色
          routeNumber: null,
          stopNumber: null
        }

        // 这里应该有后端 API 调用
        // await api.unassignOrder(orderId)
      } catch (error) {
        console.error('取消分配订单失败:', error)
        throw error
      }
    },

    // 更新订单序号
    async updateOrderIndexes(updates) {
      try {
        // 首先获取受影响的司机ID
        const firstOrder = this.orders.find(o => o.id === updates[0]?.orderId)
        if (!firstOrder) return

        const driverId = firstOrder.driverId

        // 获取该司机的所有订单
        const driverOrders = this.orders.filter(order => 
          order.status === 'assigned' && 
          order.driverId === driverId
        )

        // 创建一个映射来存储新的序号
        const newIndexMap = new Map()
        
        // 根据更新列表设置新的 stopNumber
        // 例如：如果原来是 [A,B,C,D] 对应 [1,2,3,4]
        // 想要变成 [B,A,C,D]，则 B->1, A->2, C->3, D->4
        updates.forEach(({ orderId }, index) => {
          newIndexMap.set(orderId, index + 1)  // 序号从1开始
        })

        // 更新所有受影响的订单
        driverOrders.forEach(order => {
          const orderIndex = this.orders.findIndex(o => o.id === order.id)
          if (orderIndex !== -1 && newIndexMap.has(order.id)) {
            this.orders[orderIndex] = {
              ...this.orders[orderIndex],
              stopNumber: newIndexMap.get(order.id)
            }
          }
        })

        // 这里应该有后端 API 调用
        // await api.updateOrderIndexes(updates)
      } catch (error) {
        console.error('更新订单序号失败:', error)
        throw error
      }
    },

    // 选择订单
    selectOrder(order) {
      this.selectedOrder = order
    },

    // 清除选中的订单
    clearSelectedOrder() {
      this.selectedOrder = null
    },

    // 获取所有订单
    async fetchOrders() {
      try {
        // 在实际项目中，这里应该是调用后端API
        // 现在我们直接使用 initialOrders
        this.orders = initialOrders
      } catch (error) {
        console.error('获取订单失败:', error)
        throw error
      }
    },

    // 选择/取消选择订单
    toggleOrderSelection(orderId) {
      if (this.selectedOrderIds.has(orderId)) {
        this.selectedOrderIds.delete(orderId)
      } else {
        this.selectedOrderIds.add(orderId)
      }
    },

    // 批量选择订单
    selectOrders(orderIds) {
      orderIds.forEach(id => this.selectedOrderIds.add(id))
    },

    // 取消所有选择
    clearSelectedOrders() {
      this.selectedOrderIds.clear()
    }
  }
}) 