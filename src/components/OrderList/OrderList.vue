<template>
  <div class="order-list resizable">
    <div class="resize-handle"></div>
    <div class="order-list-header">
      <h3>订单列表</h3>
      <div class="order-actions" v-if="selectedOrders.length > 0">
        <span>已选择 {{ selectedOrders.length }} 个订单</span>
        <el-button-group>
          <el-button 
            type="primary" 
            size="small"
            @click="showAssignDialog"
          >
            分配司机
          </el-button>
          <el-button 
            type="danger" 
            size="small"
            @click="unassignSelectedOrders"
          >
            取消分配
          </el-button>
        </el-button-group>
      </div>
    </div>

    <el-table 
      :data="orders" 
      @selection-change="handleSelectionChange"
      ref="orderTableRef"
      v-loading="loading"
      height="300"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="customerName" label="客户" width="120" />
      <el-table-column prop="address" label="地址" show-overflow-tooltip />
      <el-table-column label="司机" width="120">
        <template #default="{ row }">
          <template v-if="row.status === 'assigned'">
            <el-button 
              link 
              type="primary" 
              @click="showAssignDialog([row])"
            >
              {{ drivers.find(d => d.id === row.driverId)?.name || '未知司机' }}
            </el-button>
          </template>
          <el-button 
            v-else 
            link 
            type="info"
            @click="showAssignDialog([row])"
          >
            分配司机
          </el-button>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <div class="status-cell">
            <template v-if="row.status === 'assigned'">
              <div 
                class="order-index" 
                :style="{ backgroundColor: row.driverColor }"
              >
                {{ row.stopNumber }}
              </div>
              <span>已分配</span>
            </template>
            <template v-else>
              <el-tag type="warning">待分配</el-tag>
            </template>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="150" />
    </el-table>

    <!-- 分配司机弹窗 -->
    <el-dialog
      v-model="assignDialogVisible"
      title="分配司机"
      width="400px"
      :close-on-click-modal="false"
    >
      <div class="assign-dialog-content">
        <div class="selected-orders-info" v-if="ordersToAssign.length > 0">
          <p>选中 {{ ordersToAssign.length }} 个订单：</p>
          <ul>
            <li v-for="order in ordersToAssign" :key="order.id">
              {{ order.customerName }} - {{ order.address }}
            </li>
          </ul>
        </div>
        <el-radio-group v-model="selectedDriverId" class="driver-list">
          <el-radio 
            v-for="driver in drivers" 
            :key="driver.id" 
            :label="driver.id"
            class="driver-item"
          >
            <div class="driver-info">
              <div class="color-dot" :style="{ backgroundColor: driver.color }"></div>
              <span>{{ driver.name }}</span>
              <el-tag size="small" :type="driver.status === '在线' ? 'success' : 'info'">
                {{ driver.status }}
              </el-tag>
            </div>
          </el-radio>
        </el-radio-group>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="assignDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleAssign" 
            :disabled="!selectedDriverId"
          >
            确认分配
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useOrderStore } from '@/stores/order'
import { useDriverStore } from '@/stores/driver'
import { storeToRefs } from 'pinia'
import { ElMessageBox, ElMessage } from 'element-plus'

const orderStore = useOrderStore()
const driverStore = useDriverStore()
const { orders, loading } = storeToRefs(orderStore)
const { drivers } = storeToRefs(driverStore)
const orderTableRef = ref(null)
const selectedOrders = ref([])

// 分配弹窗相关
const assignDialogVisible = ref(false)
const selectedDriverId = ref(null)
const ordersToAssign = ref([])

// 显示分配弹窗
const showAssignDialog = (orders = selectedOrders.value) => {
  ordersToAssign.value = orders
  selectedDriverId.value = null
  assignDialogVisible.value = true
}

// 处理分配
const handleAssign = async () => {
  if (!selectedDriverId.value || ordersToAssign.value.length === 0) return

  try {
    for (const order of ordersToAssign.value) {
      if (order.driverId !== selectedDriverId.value) {
        if (order.status === 'assigned') {
          await orderStore.unassignOrder(order.id)
        }
        await orderStore.assignOrder(order.id, selectedDriverId.value)
      }
    }
    
    ElMessage.success('订单分配成功')
    assignDialogVisible.value = false
    orderTableRef.value?.clearSelection()
  } catch (error) {
    ElMessage.error('订单分配失败')
  }
}

// 处理多选变化
const handleSelectionChange = (selection) => {
  selectedOrders.value = selection
}

// 取消分配选中的订单
const unassignSelectedOrders = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要取消分配这 ${selectedOrders.value.length} 个订单吗？`,
      '取消分配',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    for (const order of selectedOrders.value) {
      if (order.status === 'assigned') {
        await orderStore.unassignOrder(order.id)
      }
    }

    // 清除选中状态
    orderTableRef.value?.clearSelection()
    ElMessage.success('订单取消分配成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('订单取消分配失败')
    }
  }
}

// 组件加载时获取数据
onMounted(async () => {
  await Promise.all([
    orderStore.fetchOrders(),
    driverStore.fetchDrivers()
  ])
})
</script>

<style scoped>
.order-list {
  position: relative;
  min-height: 200px;
  height: 100%;
  resize: none;
  overflow: hidden;
  padding: 20px;
  background-color: white;
  border: none;
}

.resize-handle {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: transparent;
  cursor: ns-resize;
  z-index: 10;
}

.resize-handle:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* 调整表格容器高度 */
:deep(.el-table) {
  height: calc(100% - 60px) !important; /* 减去标题和操作栏的高度 */
}

.order-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.order-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-cell {
  display: flex;
  align-items: center;
  gap: 8px;
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
  font-size: 12px;
}

:deep(.el-radio-group) {
  display: flex;
  flex-direction: column;
}

:deep(.el-radio) {
  margin-right: 0;
  margin-bottom: 4px;
}

:deep(.el-table__row) {
  height: auto;
}

:deep(.el-table__cell) {
  padding: 8px 0;
}

.assign-dialog-content {
  max-height: 60vh;
  overflow-y: auto;
}

.selected-orders-info {
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.selected-orders-info ul {
  margin: 0;
  padding-left: 20px;
  color: #666;
}

.selected-orders-info li {
  margin-bottom: 5px;
}

.driver-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.driver-item {
  margin: 0 !important;
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  transition: all 0.3s;
}

.driver-item:hover {
  background-color: #f5f7fa;
}

.driver-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

:deep(.el-radio__label) {
  padding-left: 0;
}
</style> 