<template>
  <div class="route-info">
    <template v-if="selectedDriver">
      <div class="route-header">
        <div class="route-title">
          <h3>路线信息</h3>
          <div class="route-number" :class="{ 'no-route': !currentRouteNumber }">
            路线编号: {{ currentRouteNumber ? formatRouteNumber(currentRouteNumber) : '未生成' }}
          </div>
        </div>
        <el-button
          type="primary"
          circle
          class="generate-route-btn"
          @click="generateRoute"
          :disabled="!driverOrders.length"
          :title="currentRouteNumber ? `当前路线编号: ${formatRouteNumber(currentRouteNumber)}` : '生成路线编号'"
        >
          <el-icon><Promotion /></el-icon>
        </el-button>
      </div>
      <div class="driver-info">
        <div class="color-dot" :style="{ backgroundColor: selectedDriver.color }"></div>
        <span>{{ selectedDriver.name }}</span>
        <el-tag :type="selectedDriver.status === '在线' ? 'success' : 'info'">
          {{ selectedDriver.status }}
        </el-tag>
      </div>
      
      <div class="orders-list">
        <div class="orders-header">
          <h4>分配的订单 ({{ driverOrders.length }})</h4>
          <div class="order-actions">
            <el-button 
              v-if="driverOrders.length > 1"
              type="primary" 
              size="small" 
              :loading="optimizing"
              @click="optimizeRoute"
            >
              优化路线顺序
            </el-button>
            <el-button
              v-if="driverOrders.length > 1"
              type="warning"
              size="small"
              @click="reverseOrderSequence"
            >
              <el-icon><Sort /></el-icon>
              反转顺序
            </el-button>
          </div>
        </div>
        
        <el-empty v-if="driverOrders.length === 0" description="暂无分配的订单" />
        <draggable
          v-else
          v-model="sortableOrders"
          :item-key="(item) => item.id"
          handle=".drag-handle"
          @end="onDragEnd"
          :animation="200"
        >
          <template #item="{ element: order }">
            <div class="order-item">
              <el-icon class="drag-handle"><Rank /></el-icon>
              <div class="order-index" :style="{ backgroundColor: selectedDriver.color }">
                {{ order.stopNumber }}
              </div>
              <div class="order-content">
                <h5>{{ order.customerName }}</h5>
                <p>{{ order.address }}</p>
              </div>
              <el-button 
                type="danger" 
                size="small" 
                circle
                @click.stop="unassignOrder(order)"
                class="unassign-btn"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </template>
        </draggable>
      </div>
    </template>
    <div v-else class="no-driver">
      请选择一个司机查看路线信息
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useDriverStore } from '@/stores/driver'
import { useOrderStore } from '@/stores/order'
import { useRouteStore } from '@/stores/route'
import { storeToRefs } from 'pinia'
import draggable from 'vuedraggable'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Rank, Delete, Promotion, Sort } from '@element-plus/icons-vue'

// 添加 emit 定义
const emit = defineEmits(['update:orders'])

const driverStore = useDriverStore()
const orderStore = useOrderStore()
const routeStore = useRouteStore()
const { selectedDriver } = storeToRefs(driverStore)
const optimizing = ref(false)
const currentRouteNumber = ref(null)

// 获取司机订单
const driverOrders = computed(() => {
  if (!selectedDriver.value) return []
  return orderStore.getDriverOrders(selectedDriver.value.id)
})

// 用于拖拽排序的数组
const sortableOrders = ref([])

// 移除重复的 watch，只保留一个带 immediate 的
watch(driverOrders, (newOrders) => {
  sortableOrders.value = [...newOrders]
  emit('update:orders', newOrders)
}, { deep: true, immediate: true })

// 监听司机变化
watch(selectedDriver, async (newDriver) => {
  if (newDriver) {
    sortableOrders.value = [...driverOrders.value]
    emit('update:orders', driverOrders.value)
    
    // 检查路线编号
    const routeNumber = driverOrders.value.find(order => order.routeNumber)?.routeNumber
    if (routeNumber) {
      currentRouteNumber.value = routeNumber
    } else {
      currentRouteNumber.value = null
    }
  } else {
    sortableOrders.value = []
    emit('update:orders', [])
    currentRouteNumber.value = null
  }
}, { immediate: true })

// 组件挂载时初始化
onMounted(() => {
  // 加载 Google Maps API
  if (!window.google) {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => {
      initGoogleMapsService()
    }
    document.head.appendChild(script)
  } else {
    initGoogleMapsService()
  }

  // 初始化路线编号
  if (selectedDriver.value) {
    const routeNumber = driverOrders.value.find(order => order.routeNumber)?.routeNumber
    if (routeNumber) {
      currentRouteNumber.value = routeNumber
    }
  }
})

// 添加 Google Maps 服务
let directionsService = null

// 初始化 Google Maps 服务
const initGoogleMapsService = () => {
  if (window.google && !directionsService) {
    directionsService = new google.maps.DirectionsService()
  }
}

// 优化路线顺序
const optimizeRoute = async () => {
  try {
    // 检查是否有足够的订单
    if (sortableOrders.value.length < 2) {
      ElMessage.warning('需要至少两个订单才能优化路线')
      return
    }

    // 检查所有订单是否都有位置信息
    const hasInvalidOrders = sortableOrders.value.some(order => !order.location || !order.location.lat || !order.location.lng)
    if (hasInvalidOrders) {
      ElMessage.error('存在无效的订单位置信息')
      return
    }

    optimizing.value = true
    
    // 确保 Google Maps 服务已初始化
    if (!directionsService) {
      initGoogleMapsService()
    }

    // 准备途经点
    const waypoints = sortableOrders.value.slice(1, -1).map(order => ({
      location: new google.maps.LatLng(
        order.location.lat,
        order.location.lng
      ),
      stopover: true
    }))

    // 构建请求
    const request = {
      origin: new google.maps.LatLng(
        sortableOrders.value[0].location.lat,
        sortableOrders.value[0].location.lng
      ),
      destination: new google.maps.LatLng(
        sortableOrders.value[sortableOrders.value.length - 1].location.lat,
        sortableOrders.value[sortableOrders.value.length - 1].location.lng
      ),
      waypoints: waypoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING
    }

    // 获取优化后的路线
    const result = await directionsService.route(request)
    
    // 根据优化后的路线顺序重新排序订单
    const waypointOrder = result.routes[0].waypoint_order
    const newOrders = [sortableOrders.value[0]] // 起点
    
    // 按优化后的顺序添加中间点
    waypointOrder.forEach(index => {
      newOrders.push(sortableOrders.value[index + 1])
    })
    
    newOrders.push(sortableOrders.value[sortableOrders.value.length - 1]) // 终点
    
    // 更新订单序号
    const updates = newOrders.map((order, index) => ({
      orderId: order.id,
      newIndex: index + 1
    }))
    
    // 更新存储中的订单序号
    await orderStore.updateOrderIndexes(updates)

    // 更新可排序订单列表
    sortableOrders.value = [...newOrders]
    
    // 如果有路线编号，更新路线数据
    if (currentRouteNumber.value) {
      routeStore.updateRouteOrders(currentRouteNumber.value, newOrders)
    }

    // 通知父组件重新渲染地图
    emit('update:orders', []) // 先清空
    emit('update:orders', newOrders) // 再更新
    
    ElMessage.success('路线顺序优化完成')
  } catch (error) {
    console.error('路线优化失败:', error)
    ElMessage.error('路线优化失败，请重试')
  } finally {
    optimizing.value = false
  }
}

// 处理拖拽结束事件
const onDragEnd = async () => {
  try {
    const updates = sortableOrders.value.map((order, index) => ({
      orderId: order.id,
      newIndex: index + 1
    }))
    
    await orderStore.updateOrderIndexes(updates)

    // 如果已有路线，更新路线数据
    if (currentRouteNumber.value) {
      routeStore.updateRouteOrders(currentRouteNumber.value, sortableOrders.value)
    }

    // 通知父组件重新渲染地图
    emit('update:orders', []) // 先清空
    emit('update:orders', sortableOrders.value) // 再更新
  } catch (error) {
    console.error('更新订单顺序失败:', error)
    ElMessage.error('更新顺序失败，请重试')
  }
}

// 取消分配订单
const unassignOrder = async (order) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消分配订单 ${order.customerName} 吗？`,
      '取消分配',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await orderStore.unassignOrder(order.id)
    
    // 更新当前路线的订单列表
    if (currentRouteNumber.value) {
      const updatedOrders = driverOrders.value
      
      // 如果没有剩余订单，清除路线编号
      if (updatedOrders.length === 0) {
        currentRouteNumber.value = null
      }
      
      // 更新路线中的订单
      routeStore.updateRouteOrders(currentRouteNumber.value, updatedOrders)
    }

    // 通知父组件更新地图显示
    emit('update:orders', driverOrders.value)

    ElMessage.success('订单已取消分配')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消分配订单失败:', error)
      ElMessage.error('取消分配失败，请重试')
    }
  }
}

// 格式化路线编号为5位数
const formatRouteNumber = (num) => {
  return String(num).padStart(5, '0')
}

// 生成新路线或更新现有路线
const generateNewRoute = async () => {
  try {
    if (!selectedDriver.value || !driverOrders.value.length) {
      ElMessage.warning('请先分配订单给司机')
      return
    }

    // 检查是否已有活动路线
    if (currentRouteNumber.value) {
      // 更新现有路线
      routeStore.updateRouteOrders(currentRouteNumber.value, driverOrders.value)
      
      // 更新所有相关订单的路线编号
      for (const order of driverOrders.value) {
        await orderStore.assignOrder(order.id, selectedDriver.value.id, currentRouteNumber.value)
      }
      
      ElMessage.success(`路线 ${formatRouteNumber(currentRouteNumber.value)} 更新成功`)
      return
    }

    // 生成新路线
    await ElMessageBox.confirm(
      '确定要为当前订单生成新的路线编号吗？',
      '生成路线',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    const newRoute = routeStore.createRoute(selectedDriver.value.id, driverOrders.value)
    if (newRoute) {
      currentRouteNumber.value = newRoute.routeNumber
      
      // 更新所有相关订单的路线编号
      for (const order of driverOrders.value) {
        await orderStore.assignOrder(order.id, selectedDriver.value.id, newRoute.routeNumber)
      }
      
      ElMessage.success(`已生成路线编号: ${formatRouteNumber(newRoute.routeNumber)}`)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('生成路线失败')
    }
  }
}

// 反转订单顺序
const reverseOrderSequence = async () => {
  if (driverOrders.value.length < 2) return
  
  try {
    // 获取当前订单并反转
    const reversedOrders = [...driverOrders.value].reverse()
    
    // 更新订单序号
    const updates = reversedOrders.map((order, index) => ({
      orderId: order.id,
      newIndex: index + 1
    }))
    
    // 更新存储中的订单序号
    await orderStore.updateOrderIndexes(updates)
    
    // 如果已有路线，更新路线数据
    if (currentRouteNumber.value) {
      routeStore.updateRouteOrders(currentRouteNumber.value, reversedOrders)
    }

    // 通知父组件重新渲染地图
    emit('update:orders', []) // 先清空
    emit('update:orders', reversedOrders) // 再更新
    
    ElMessage.success('路线顺序已反转')
  } catch (error) {
    console.error('反转顺序失败:', error)
    ElMessage.error('反转顺序失败，请重试')
  }
}

// 生成路线
const generateRoute = () => {
  if (!selectedDriver.value || !driverOrders.value.length) {
    ElMessage.warning('请先选择司机和订单')
    return
  }

  try {
    // 调用 createRoute 并获取返回的数据
    const routeData = routeStore.createRoute(
      selectedDriver.value.id,
      driverOrders.value
    )

    // 确保数据被输出到控制台
    console.log('Generated Route:', routeData)

    // 可以添加成功提示
    ElMessage.success('路线数据已生成')
  } catch (error) {
    console.error('生成路线失败:', error)
    ElMessage.error('生成路线失败')
  }
}
</script>

<style scoped>
.route-info {
  padding: 20px;
}

.driver-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.orders-list {
  margin-top: 20px;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background-color: #fff;
  border-radius: 4px;
  margin-bottom: 8px;
  border: 1px solid #ebeef5;
  transition: all 0.3s;
}

.order-item:hover {
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.drag-handle {
  cursor: move;
  color: #909399;
}

.order-index {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  flex-shrink: 0;
}

.order-content {
  flex-grow: 1;
  min-width: 0;
}

.order-content h5 {
  margin: 0 0 5px 0;
}

.order-content p {
  margin: 0;
  color: #666;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unassign-btn {
  opacity: 0;
  transition: opacity 0.3s;
}

.order-item:hover .unassign-btn {
  opacity: 1;
}

.no-driver {
  text-align: center;
  color: #999;
  padding: 40px 0;
}

.orders-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.orders-header h4 {
  margin: 0;
}

.route-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.generate-route-btn {
  transition: all 0.3s;
}

.generate-route-btn:hover {
  transform: scale(1.1);
}

.route-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.route-number {
  background-color: #f0f9ff;
  padding: 4px 8px;
  border-radius: 4px;
  color: #409eff;
  font-weight: bold;
  font-size: 14px;
}

.route-number.no-route {
  background-color: #f4f4f5;
  color: #909399;
}

.order-actions {
  display: flex;
  gap: 8px;
}
</style> 