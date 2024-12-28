<template>
  <div class="home">
    <el-container>
      <!-- 左侧边栏 - 可调整宽度 -->
      <el-aside class="resizable-aside" width="300px">
        <div class="resize-handle-vertical"></div>
        <driver-list />
      </el-aside>
      
      <!-- 主要内容区 -->
      <el-main class="main-content">
        <div class="content-container">
          <map-view class="map-component" />
          <order-list class="order-component" />
        </div>
      </el-main>

      <!-- 右侧抽屉 -->
      <el-drawer
        v-model="showRouteInfo"
        direction="rtl"
        size="300px"
        :with-header="false"
      >
        <route-info />
      </el-drawer>
    </el-container>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDriverStore } from '@/stores/driver'
import DriverList from '@/components/DriverList/DriverList.vue'
import MapView from '@/components/MapView/MapView.vue'
import RouteInfo from '@/components/RouteInfo/RouteInfo.vue'
import OrderList from '@/components/OrderList/OrderList.vue'

const driverStore = useDriverStore()
const { selectedDriver } = storeToRefs(driverStore)
const showRouteInfo = ref(false)

// 监听选中的司机变化
watch(selectedDriver, (newDriver) => {
  showRouteInfo.value = !!newDriver
})
</script>

<style scoped>
.home {
  height: 100vh;
  overflow: hidden;
}

.el-container {
  height: 100%;
}

.main-content {
  padding: 0;
  display: flex;
  overflow: hidden;
}

.content-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

/* 可调整宽度的侧边栏 */
.resizable-aside {
  position: relative;
  min-width: 200px;
  max-width: 500px;
  resize: horizontal;
  overflow: hidden;
  border-right: 1px solid #dcdfe6;
  padding: 0;
}

/* 垂直调整手柄 */
.resize-handle-vertical {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 6px;
  background: transparent;
  cursor: ew-resize;
  z-index: 10;
}

.resize-handle-vertical:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* 地图和订单列表组件样式 */
.map-component {
  flex: 0 0 auto;
  margin: 0;
  border-radius: 0;
}

.order-component {
  flex: 1 1 auto;
  margin: 0;
  border-radius: 0;
}

:deep(.el-drawer__body) {
  padding: 0;
  overflow: auto;
}
</style> 