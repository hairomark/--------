<template>
  <div class="driver-list">
    <h3>司机列表</h3>
    <el-table 
      :data="drivers" 
      @row-click="handleDriverSelect"
      :highlight-current-row="true"
      ref="driverTableRef"
      v-loading="loading"
    >
      <el-table-column prop="name" label="姓名" />
      <el-table-column prop="status" label="状态">
        <template #default="{ row }">
          <el-tag :type="row.status === '在线' ? 'success' : 'info'">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useDriverStore } from '@/stores/driver'
import { storeToRefs } from 'pinia'

const driverStore = useDriverStore()
const { drivers, selectedDriver, loading } = storeToRefs(driverStore)
const driverTableRef = ref(null)

// 处理司机选中
const handleDriverSelect = (driver) => {
  if (selectedDriver.value?.id === driver.id) {
    driverStore.clearSelectedDriver()
    driverTableRef.value?.setCurrentRow(null)
  } else {
    driverStore.selectDriver(driver)
    driverTableRef.value?.setCurrentRow(driver)
  }
}

// 组件加载时获取司机列表数据
onMounted(async () => {
  await driverStore.fetchDrivers()
  if (selectedDriver.value) {
    driverTableRef.value?.setCurrentRow(selectedDriver.value)
  }
})
</script>

<style scoped>
.driver-list {
  padding: 20px;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row.current-row) {
  background-color: var(--el-table-current-row-bg-color);
}
</style> 