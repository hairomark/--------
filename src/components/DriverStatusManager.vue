<template>
  <div>
    <el-button type="primary" @click="openDialog">
      管理司机状态
    </el-button>

    <el-dialog
      title="管理司机状态"
      v-model="dialogVisible"
      width="500px"
    >
      <div class="driver-list">
        <el-checkbox-group v-model="selectedDriverIds">
          <div v-for="driver in driverStore.allDrivers" :key="driver.id" class="driver-item">
            <el-checkbox :label="driver.id">
              <div class="driver-info">
                <div class="color-dot" :style="{ backgroundColor: driver.color }"></div>
                <span>{{ driver.name }}</span>
                <span class="driver-phone">{{ driver.phone }}</span>
              </div>
            </el-checkbox>
          </div>
        </el-checkbox-group>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveDriverStatuses">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useDriverStore } from '@/stores/driver'
import { ElMessage } from 'element-plus'

const driverStore = useDriverStore()
const dialogVisible = ref(false)
const selectedDriverIds = ref([])

// 打开对话框时初始化选中状态
const openDialog = () => {
  selectedDriverIds.value = driverStore.activeDrivers.map(d => d.id)
  dialogVisible.value = true
}

// 保存司机状态
const saveDriverStatuses = () => {
  try {
    driverStore.updateDriverStatuses(selectedDriverIds.value)
    dialogVisible.value = false
    ElMessage.success('司机状态更新成功')
  } catch (error) {
    console.error('更新司机状态失败:', error)
    ElMessage.error('更新失败，请重试')
  }
}

// 监听对话框关闭，重置选中状态
watch(dialogVisible, (newVal) => {
  if (!newVal) {
    selectedDriverIds.value = driverStore.activeDrivers.map(d => d.id)
  }
})

// 组件加载时初始化选中状态
onMounted(() => {
  selectedDriverIds.value = driverStore.activeDrivers.map(d => d.id)
})
</script>

<style scoped>
.driver-list {
  max-height: 400px;
  overflow-y: auto;
}

.driver-item {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.driver-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.driver-phone {
  color: #666;
  font-size: 14px;
  margin-left: 12px;
}
</style> 