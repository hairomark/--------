<template>
  <div class="route-info">
    <template v-if="selectedDriver">
      <h3>路线信息</h3>
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
          <el-button 
            v-if="driverOrders.length > 1"
            type="primary" 
            size="small" 
            :loading="optimizing"
            @click="optimizeRoute"
          >
            优化路线顺序
          </el-button>
        </div>
        
        <el-empty v-if="driverOrders.length === 0" description="暂无分配的订单" />
        <draggable
          v-else
          v-model="sortableOrders"
          item-key="id"
          handle=".drag-handle"
          @end="onDragEnd"
          :animation="200"
        >
          <template #item="{ element: order }">
            <div class="order-item">
              <el-icon class="drag-handle"><Rank /></el-icon>
              <div class="order-index" :style="{ backgroundColor: selectedDriver.color }">
                {{ order.orderIndex }}
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
import { computed, ref, watch, onMounted } from 'vue'
import { useDriverStore } from '@/stores/driver'
import { useOrderStore } from '@/stores/order'
import { storeToRefs } from 'pinia'
import draggable from 'vuedraggable'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Rank, Delete } from '@element-plus/icons-vue'

const driverStore = useDriverStore()
const orderStore = useOrderStore()
const { selectedDriver } = storeToRefs(driverStore)
const optimizing = ref(false)

const driverOrders = computed(() => {
  if (!selectedDriver.value) return []
  return orderStore.getDriverOrders(selectedDriver.value.id)
})

// 用于拖拽排序的数组
const sortableOrders = ref([])

// 监听 driverOrders 变化，更新 sortableOrders
watch(driverOrders, (newOrders) => {
  sortableOrders.value = [...newOrders]
}, { deep: true })

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
    
    console.log('更新订单序号:', updates)
    
    // 更新存储中的订单序号
    await orderStore.updateOrderIndexes(updates)
    
    ElMessage.success('路线顺序优化完成')
  } catch (error) {
    console.error('路线优化失败:', error)
    ElMessage.error('路线优化失败，请重试')
  } finally {
    optimizing.value = false
  }
}

// 在组件挂载时加载 Google Maps API
onMounted(() => {
  // 动态加载 Google Maps API
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
})

// 处理拖拽结束事件
const onDragEnd = async () => {
  // 更新所有订单的序号
  const updates = sortableOrders.value.map((order, index) => ({
    orderId: order.id,
    newIndex: index + 1
  }))
  
  // 调用 store 中的方法更新订单序号
  await orderStore.updateOrderIndexes(updates)
}

// 取消分配订单
const unassignOrder = async (order) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消分配订单 #${order.orderIndex} (${order.customerName}) 吗？`,
      '取消分配',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    await orderStore.unassignOrder(order.id)
  } catch (error) {
    // 用户取消操作
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
</style> 