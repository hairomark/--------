<template>
  <div class="driver-list">
    <div class="header">
      <h3>司机列表</h3>
      <DriverStatusManager />
    </div>
    
    <el-empty v-if="!availableDrivers.length" description="暂无在线司机" />
    
    <div v-else class="drivers">
      <div
        v-for="driver in availableDrivers"
        :key="driver.id"
        class="driver-item"
        :class="{ active: selectedDriver?.id === driver.id }"
        @click="selectDriver(driver)"
      >
        <div class="driver-main">
          <div class="driver-color" :style="{ backgroundColor: driver.color }"></div>
          <div class="driver-details">
            <div class="driver-header">
              <span class="driver-name">{{ driver.name }}</span>
              <el-tag :type="driver.status === '在线' ? 'success' : 'info'" size="small">
                {{ driver.status }}
              </el-tag>
            </div>
            <div class="driver-info">
              <span class="driver-phone">{{ driver.phone }}</span>
              <span class="order-count">
                <el-badge :value="getDriverOrderCount(driver.id)" :max="99" type="primary">
                  订单数
                </el-badge>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useDriverStore } from '@/stores/driver'
import { storeToRefs } from 'pinia'
import { useOrderStore } from '@/stores/order'
import DriverStatusManager from '@/components/DriverStatusManager.vue'

const driverStore = useDriverStore()
const orderStore = useOrderStore()
const { selectedDriver } = storeToRefs(driverStore)
const availableDrivers = computed(() => driverStore.availableDrivers)

// 组件加载时获取司机列表数据
onMounted(async () => {
  await driverStore.fetchDrivers()
  await orderStore.fetchOrders() // 确保订单数据也被加载
})

// 添加获取司机订单数量的方法
const getDriverOrderCount = (driverId) => {
  return orderStore.getDriverOrders(driverId).length
}

// 修改选中司机的方法
const selectDriver = (driver) => {
  if (selectedDriver.value?.id === driver.id) {
    driverStore.clearSelectedDriver()
  } else {
    driverStore.selectDriver(driver)
  }
}
</script>

<style scoped>
.driver-list {
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.header h3 {
  margin: 0;
  color: #303133;
}

.drivers {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.driver-item {
  padding: 16px;
  border-radius: 6px;
  background-color: #f8f9fa;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.driver-item:hover {
  background-color: #f0f2f5;
  transform: translateY(-1px);
}

.driver-item.active {
  background-color: #ecf5ff;
  border-color: #409eff;
}

.driver-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.driver-color {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.driver-details {
  flex-grow: 1;
  min-width: 0;
}

.driver-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.driver-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.driver-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.driver-phone {
  color: #909399;
  font-size: 14px;
}

.order-count {
  display: flex;
  align-items: center;
}

:deep(.el-badge__content) {
  background-color: #409eff;
}

:deep(.el-tag--small) {
  height: 20px;
  padding: 0 6px;
  font-size: 12px;
}
</style> 