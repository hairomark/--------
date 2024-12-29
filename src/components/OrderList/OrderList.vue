<template>
  <div class="order-list-container">
    <div class="header">
      <div class="header-left">
        <h3>订单列表 ({{ filteredOrders.length }})</h3>
        <el-switch
          :model-value="showAllOrders"
          @update:model-value="showAllOrders = $event"
          active-text="全部"
          inactive-text="待分配"
          inline-prompt
        />
      </div>
      <div class="header-right" v-if="orderStore.selectedOrders.length">
        <span class="selected-count">已选择 {{ orderStore.selectedOrders.length }} 个订单</span>
        <el-button 
          type="primary" 
          size="small"
          :disabled="!selectedDriver"
          @click="batchAssignOrders"
        >
          批量分配
        </el-button>
      </div>
    </div>
    
    <div class="orders-wrapper">
      <el-empty v-if="!filteredOrders.length" :description="emptyText" />
      
      <div v-else class="orders">
        <div
          v-for="order in filteredOrders"
          :key="order.id"
          class="order-item"
          :class="{ active: selectedOrder?.id === order.id }"
        >
          <el-checkbox 
            v-if="order.status === 'pending'"
            :model-value="orderStore.selectedOrderIds.has(order.id)"
            @change="(val) => handleOrderSelect(order.id, val)"
          />
          <div class="order-main" @click="selectOrder(order)">
            <div class="order-info">
              <span class="customer-name">{{ order.customerName }}</span>
              <el-tooltip :content="order.address" placement="top">
                <span class="address">{{ order.address }}</span>
              </el-tooltip>
            </div>
            <div class="order-status">
              <span v-if="order.status === 'assigned'" class="stop-number">
                #{{ order.stopNumber }}
              </span>
              <el-tag size="small" :type="order.status === 'pending' ? 'warning' : 'success'">
                {{ order.status === 'pending' ? '待分配' : getDriverName(order.driverId) }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useOrderStore } from '@/stores/order'
import { useDriverStore } from '@/stores/driver'
import { ElMessage } from 'element-plus'

const orderStore = useOrderStore()
const driverStore = useDriverStore()

// 只解构需要的响应式引用
const { selectedOrder } = storeToRefs(orderStore)
const { selectedDriver } = storeToRefs(driverStore)

// 使用 showAllOrders 替代 viewMode
const showAllOrders = ref(false)

// 添加组件挂载时的初始化
onMounted(async () => {
  // 确保订单数据被加载
  await orderStore.fetchOrders()
})

// 添加 watch 来监听切换
watch(showAllOrders, (newValue) => {
  console.log('切换显示模式:', newValue ? '全部' : '待分配')
  console.log('当前所有订单:', orderStore.allOrders)
  console.log('当前待分配订单:', orderStore.pendingOrders)
})

// 根据 showAllOrders 筛选订单
const filteredOrders = computed(() => {
  console.log('重新计算 filteredOrders')
  console.log('showAllOrders:', showAllOrders.value)
  const orders = showAllOrders.value 
    ? orderStore.allOrders 
    : orderStore.pendingOrders
  console.log('筛选后的订单:', orders)
  return orders
})

// 空状态文本
const emptyText = computed(() => {
  return showAllOrders.value ? '暂无订单' : '暂无待分配订单'
})

// 获取司机名称
const getDriverName = (driverId) => {
  const driver = driverStore.allDrivers.find(d => d.id === driverId)
  return driver ? driver.name : '未知司机'
}

// 获取司机颜色
const getDriverColor = (driverId) => {
  const driver = driverStore.allDrivers.find(d => d.id === driverId)
  return driver ? driver.color : '#999'
}

// 格式化路线编号
const formatRouteNumber = (num) => {
  return String(num).padStart(5, '0')
}

// 选择订单
const selectOrder = (order) => {
  if (selectedOrder.value?.id === order.id) {
    orderStore.clearSelectedOrder()
  } else {
    orderStore.selectOrder(order)
  }
}

// 处理订单选择
const handleOrderSelect = (orderId, selected) => {
  orderStore.toggleOrderSelection(orderId)
}

// 批量分配订单
const batchAssignOrders = async () => {
  if (!selectedDriver.value) return
  
  try {
    const selectedOrders = orderStore.selectedOrders
    for (const order of selectedOrders) {
      await orderStore.assignOrder(order.id, selectedDriver.value.id)
    }
    orderStore.clearSelectedOrders()
    ElMessage.success(`成功分配 ${selectedOrders.length} 个订单`)
  } catch (error) {
    console.error('批量分配订单失败:', error)
    ElMessage.error('批量分配失败，请重试')
  }
}
</script>

<style scoped>
.order-list-container {
  padding: 20px;
  height: 100%;  /* 使容器占满可用高度 */
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-count {
  color: #606266;
  font-size: 14px;
}

.orders-wrapper {
  flex: 1;  /* 占用剩余空间 */
  overflow: hidden;  /* 防止溢出 */
  position: relative;
}

.orders {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;  /* 垂直滚动 */
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 8px;  /* 为滚动条留出空间 */
}

/* 美化滚动条 */
.orders::-webkit-scrollbar {
  width: 6px;
}

.orders::-webkit-scrollbar-thumb {
  background-color: #909399;
  border-radius: 3px;
}

.orders::-webkit-scrollbar-track {
  background-color: #f5f7fa;
}

.header h3 {
  margin: 0;
  color: #303133;
}

.orders {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background-color: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.order-main {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 0;
  cursor: pointer;
}

.order-info {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.customer-name {
  font-weight: 500;
  white-space: nowrap;
  min-width: 100px;
}

.address {
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.order-status {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.stop-number {
  font-size: 12px;
  font-weight: bold;
  color: #409EFF;
  background-color: #ECF5FF;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 添加切换按钮样式 */
.header :deep(.el-switch) {
  --el-switch-on-color: #409eff;
  --el-switch-off-color: #13ce66;
}

.header :deep(.el-switch__label) {
  color: #606266;
}
</style> 