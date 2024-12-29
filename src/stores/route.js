import { defineStore } from 'pinia'
import { useDriverStore } from './driver'
import { useOrderStore } from './order'

export const useRouteStore = defineStore('route', {
  state: () => ({
    routes: [],
    currentRouteNumber: 0
  }),

  actions: {
    // 从 localStorage 加载路线数据
    loadRoutes() {
      const savedRoutes = localStorage.getItem('routes')
      if (savedRoutes) {
        this.routes = JSON.parse(savedRoutes)
        // 设置当前路线编号为最大编号 + 1
        this.currentRouteNumber = Math.max(...this.routes.map(r => r.routeNumber), 0) + 1
      }
    },

    // 保存路线数据到 localStorage
    saveRoutes() {
      localStorage.setItem('routes', JSON.stringify(this.routes))
    },

    // 创建新路线
    createRoute(driverId, orders) {
      console.log('Creating route for driver:', driverId)
      console.log('Orders before processing:', orders)

      // 生成新的路线编号
      const routeNumber = this.currentRouteNumber++
      console.log('Generated route number:', routeNumber)

      // 创建简单的路线数据
      const routeData = {
        routeNumber,
        driverId,
        orders: orders.map(order => ({
          orderId: order.id,
          stopNumber: order.stopNumber
        }))
      }

      // 将路线数据转换为 JSON 并输出到控制台
      const jsonData = JSON.stringify(routeData, null, 2)
      console.log('Route Data:', jsonData)

      return routeData
    },

    // 更新现有路线的订单
    updateRouteOrders(routeNumber, orders) {
      const route = this.routes.find(r => r.routeNumber === routeNumber)
      if (route) {
        // 更新路线中的订单，并根据顺序重新分配 stopNumber
        route.orders = orders.map((order, index) => ({
          id: order.id,
          customerName: order.customerName,
          address: order.address,
          location: order.location,
          stopNumber: index + 1  // 根据顺序重新分配 stopNumber
        }))

        // 同时更新订单store中的 stopNumber
        const orderStore = useOrderStore()
        orders.forEach((order, index) => {
          const stopNumber = index + 1
          const orderIndex = orderStore.orders.findIndex(o => o.id === order.id)
          if (orderIndex !== -1) {
            orderStore.orders[orderIndex] = {
              ...orderStore.orders[orderIndex],
              stopNumber: stopNumber
            }
          }
        })

        this.saveRoutes()
      }
    },

    // 更新路线状态
    updateRouteStatus(routeNumber, status) {
      const route = this.routes.find(r => r.routeNumber === routeNumber)
      if (route) {
        route.status = status
        this.saveRoutes()
      }
    },

    // 获取司机的当前活动路线
    getDriverActiveRoute(driverId) {
      return this.routes.find(r => r.driverId === driverId && r.status === 'active')
    },

    // 获取所有活动路线
    getActiveRoutes() {
      return this.routes.filter(r => r.status === 'active')
    }
  }
}) 