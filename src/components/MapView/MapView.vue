<template>
  <div class="map-view" ref="mapViewRef">
    <div class="resize-handle top" @mousedown="(e) => startResize(e, 'top')"></div>
    <div class="resize-handle right" @mousedown="(e) => startResize(e, 'right')"></div>
    <div class="resize-handle bottom" @mousedown="(e) => startResize(e, 'bottom')"></div>
    <div class="resize-handle left" @mousedown="(e) => startResize(e, 'left')"></div>
    <div class="resize-handle top-left" @mousedown="(e) => startResize(e, 'top-left')"></div>
    <div class="resize-handle top-right" @mousedown="(e) => startResize(e, 'top-right')"></div>
    <div class="resize-handle bottom-left" @mousedown="(e) => startResize(e, 'bottom-left')"></div>
    <div class="resize-handle bottom-right" @mousedown="(e) => startResize(e, 'bottom-right')"></div>
    <h3>地图视图</h3>
    <div class="map-controls">
      <template v-if="selectedOrders.length > 0">
        <div class="selection-info">
          <span>已选择 {{ selectedOrders.length }} 个订单</span>
          <el-button 
            type="text" 
            @click="clearSelectedOrders"
            class="clear-btn"
          >
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
        <el-button 
          type="success" 
          :disabled="!selectedDriver" 
          @click="assignOrdersToDriver"
        >
          分配给当前司机
        </el-button>
      </template>
      
    </div>
    <div id="map" class="map-container"></div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { useOrderStore } from '@/stores/order'
import { useDriverStore } from '@/stores/driver'
import { Close } from '@element-plus/icons-vue'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

// 检查 Mapbox token
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
if (!MAPBOX_TOKEN) {
  console.error('未置 Mapbox token')
}

mapboxgl.accessToken = MAPBOX_TOKEN

const orderStore = useOrderStore()
const driverStore = useDriverStore()
const { orders } = storeToRefs(orderStore)
const { selectedDriver } = storeToRefs(driverStore)

const map = ref(null)
const draw = ref(null)
const markers = ref([])
const selectedOrders = ref([])
const routeLine = ref(null)

// 添加拖拽�����关的状态和方法
const isResizing = ref(false)
const resizeDirection = ref(null)
const startPos = ref({ x: 0, y: 0 })
const startSize = ref({ width: 0, height: 0 })
const mapViewRef = ref(null)

const startResize = (e, direction) => {
  isResizing.value = true
  resizeDirection.value = direction
  startPos.value = { x: e.clientX, y: e.clientY }
  const rect = mapViewRef.value.getBoundingClientRect()
  startSize.value = { width: rect.width, height: rect.height }
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

const handleResize = (e) => {
  if (!isResizing.value) return
  
  const dx = e.clientX - startPos.value.x
  const dy = e.clientY - startPos.value.y
  const dir = resizeDirection.value
  
  if (dir.includes('right')) {
    mapViewRef.value.style.width = `${startSize.value.width + dx}px`
  }
  if (dir.includes('bottom')) {
    mapViewRef.value.style.height = `${startSize.value.height + dy}px`
  }
  if (dir.includes('left')) {
    const newWidth = startSize.value.width - dx
    mapViewRef.value.style.width = `${newWidth}px`
  }
  if (dir.includes('top')) {
    const newHeight = startSize.value.height - dy
    mapViewRef.value.style.height = `${newHeight}px`
  }

  // 调整地图大小
  if (map.value) {
    map.value.resize()
  }
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

// 添加防抖函数
const debounce = (fn, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(null, args), delay)
  }
}

// 创建防抖版本的地图调整函数
const debouncedMapResize = debounce(() => {
  if (map.value) {
    map.value.resize()
  }
}, 100)

// 初始化地图
const initMap = () => {
  try {
    map.value = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-79.3832, 43.6532], // Toronto coordinates
      zoom: 11, // 调整缩放级别以更好地显示多伦多区域
      attributionControl: true
    })

    // 添加导航控件
    map.value.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true
      }), 
      'top-right'
    )

    // 添加比例尺
    map.value.addControl(
      new mapboxgl.ScaleControl({
        maxWidth: 100,
        unit: 'metric'
      }), 
      'bottom-right'
    )

    // 初始化绘图工具
    draw.value = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true
      }
    })

    map.value.addControl(draw.value)

    // 监听绘制完成事件
    map.value.on('draw.create', handleDrawCreate)
    map.value.on('draw.delete', handleDrawDelete)

    // 监听地图加载完成
    map.value.on('load', () => {
      console.log('地图加载完成')
      createMarkers()
      updateRoute()
    })

  } catch (error) {
    console.error('地图初始化失败:', error)
  }
}

// 创建标记
const createMarkers = () => {
  // 清除现有标记
  markers.value.forEach(marker => marker.remove())
  markers.value = []

  // 按位置分组订单
  const locationGroups = {}
  orders.value.forEach(order => {
    if (!order.location) return
    const key = `${order.location.lat},${order.location.lng}`
    if (!locationGroups[key]) locationGroups[key] = []
    locationGroups[key].push(order)
  })

  // 为每个位置创建标记
  Object.entries(locationGroups).forEach(([key, locationOrders]) => {
    const [lat, lng] = key.split(',').map(Number)
    const assignedOrder = locationOrders.find(o => o.status === 'assigned')
    const isSelected = selectedOrders.value.some(order => 
      order.location.lat === lat && order.location.lng === lng
    )

    // 创建标记元素
    const el = document.createElement('div')
    el.className = 'marker'
    el.style.backgroundColor = assignedOrder ? assignedOrder.driverColor : 
                              (isSelected ? '#4CAF50' : '#FF0000')
    if (assignedOrder && !isSelected) {
      el.textContent = assignedOrder.stopNumber
    }

    // 创建弹出窗口
    const popup = new mapboxgl.Popup({ offset: 25 })
      .setHTML(createPopupContent(locationOrders))

    // 创建标记
    const marker = new mapboxgl.Marker({
      element: el,
      anchor: 'center'
    })
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map.value)

    markers.value.push(marker)
  })
}

// 创建弹出窗口内容
const createPopupContent = (orders) => {
  return `
    <div class="popup-content">
      <h4>该位置共 ${orders.length} 个订单</h4>
      ${orders.map(order => `
        <div class="order-item">
          <div class="order-header">
            ${order.status === 'assigned' ? 
              `<div class="order-index" style="background-color: ${order.driverColor}">
                ${order.stopNumber}
              </div>` : 
              '<div class="order-index" style="background-color: #FF0000"></div>'
            }
            <strong>${order.customerName}</strong>
          </div>
          <div class="order-address">${order.address}</div>
          <div class="order-status">
            状态: ${order.status === 'assigned' ? '已分配' : '待分配'}
          </div>
        </div>
      `).join('')}
    </div>
  `
}

// 处理绘制完成事件
const handleDrawCreate = (e) => {
  const polygon = e.features[0]
  
  // 获取在多边形内的订单
  const newSelectedOrders = orders.value.filter(order => {
    if (!order.location) return false
    return pointInPolygon(
      [order.location.lng, order.location.lat],
      polygon.geometry.coordinates[0]
    )
  })

  // 更新选中的订单
  selectedOrders.value = [...selectedOrders.value, ...newSelectedOrders]
  
  // 更新标记样式
  createMarkers()

  // 清除绘制的多边形
  draw.value.deleteAll()
}

// 处理绘制删除事件
const handleDrawDelete = () => {
  clearSelectedOrders()
}

// 判断点是否在多边形内
const pointInPolygon = (point, polygon) => {
  // 使用射线法判断点是否在多边形内
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]
    const xj = polygon[j][0], yj = polygon[j][1]
    
    const intersect = ((yi > point[1]) !== (yj > point[1])) &&
        (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

// 清除选中的订单
const clearSelectedOrders = () => {
  selectedOrders.value = []
  createMarkers()
}

// 分配订单给司机
const assignOrdersToDriver = async () => {
  if (!selectedDriver.value || !selectedOrders.value.length) return

  const ordersToAssign = [...selectedOrders.value]
  clearSelectedOrders()

  for (const order of ordersToAssign) {
    await orderStore.assignOrder(order.id, selectedDriver.value.id)
  }

  createMarkers()
  updateRoute()
}

// 更新线
const updateRoute = async () => {
  if (!selectedDriver.value) {
    if (routeLine.value) {
      map.value.removeLayer('route')
      map.value.removeSource('route')
      routeLine.value = null
    }
    return
  }

  const driverOrders = orderStore.getDriverOrders(selectedDriver.value.id)
  if (driverOrders.length < 2) return

  // 构建路线请求
  const coordinates = driverOrders
    .sort((a, b) => a.stopNumber - b.stopNumber)
    .map(order => [order.location.lng, order.location.lat])

  // 获取路线数据
  const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates.join(';')}?geometries=geojson&access_token=${mapboxgl.accessToken}`)
  const data = await response.json()

  // 更新路线图层
  if (routeLine.value) {
    map.value.removeLayer('route')
    map.value.removeSource('route')
  }

  map.value.addSource('route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      properties: {},
      geometry: data.routes[0].geometry
    }
  })

  map.value.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': selectedDriver.value.color,
      'line-width': 4,
      'line-opacity': 0.8
    }
  })

  routeLine.value = true
}

// 监听数据变化
watch([() => orders.value, selectedDriver], () => {
  if (map.value) {
    createMarkers()
    updateRoute()
  }
}, { deep: true })

// 组件挂载时初始化地图
onMounted(() => {
  initMap()
  map.value.on('load', () => {
    createMarkers()
    updateRoute()
  })

  // 创建 ResizeObserver 监听容器大小变化
  const resizeObserver = new ResizeObserver(debouncedMapResize)
  if (mapViewRef.value) {
    resizeObserver.observe(mapViewRef.value)
  }

  // 组件卸载时清理
  onUnmounted(() => {
    resizeObserver.disconnect()
  })
})

// 组件卸载时清理
onUnmounted(() => {
  if (map.value) {
    map.value.remove()
  }
})
</script>

<style>
.map-view {
  position: relative;
  min-height: 300px;
  height: 400px;
  overflow: hidden;
  padding: 20px 20px 20px 20px;
  background: white;
  border: none;
  border-bottom: 1px solid #dcdfe6;
}

.map-container {
  position: absolute;
  top: 60px;
  left: 20px;
  right: 20px;
  bottom: 20px;
  width: calc(100% - 40px) !important;
  height: calc(100% - 80px) !important;
}

/* 调整手柄基础样式 */
.resize-handle {
  position: absolute;
  background: transparent;
  z-index: 100;
}

/* 上下边框 */
.resize-handle.top,
.resize-handle.bottom {
  left: 0;
  width: 100%;
  height: 6px;
  cursor: ns-resize;
}

.resize-handle.top {
  top: 0;
}

.resize-handle.bottom {
  bottom: 0;
}

/* 左右边框 */
.resize-handle.left,
.resize-handle.right {
  top: 0;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
}

.resize-handle.left {
  left: 0;
}

.resize-handle.right {
  right: 0;
}

/* 四个角 */
.resize-handle.top-left,
.resize-handle.top-right,
.resize-handle.bottom-left,
.resize-handle.bottom-right {
  width: 10px;
  height: 10px;
}

.resize-handle.top-left {
  top: 0;
  left: 0;
  cursor: nw-resize;
}

.resize-handle.top-right {
  top: 0;
  right: 0;
  cursor: ne-resize;
}

.resize-handle.bottom-left {
  bottom: 0;
  left: 0;
  cursor: sw-resize;
}

.resize-handle.bottom-right {
  bottom: 0;
  right: 0;
  cursor: se-resize;
}

/* 悬停效果 */
.resize-handle:hover {
  background: rgba(0, 0, 0, 0.1);
}

.map-controls {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1;
  display: flex;
  gap: 10px;
  align-items: center;
}

.selection-info {
  background-color: rgba(255, 255, 255, 0.9);
  padding: 6px 12px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.marker {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  border: 2px solid white;
  cursor: pointer;
}

.popup-content {
  padding: 10px;
}

.order-item {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.order-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}

.order-index {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 12px;
}

.order-address {
  color: #666;
  font-size: 12px;
}

.order-status {
  color: #999;
  font-size: 12px;
  margin-top: 5px;
}

/* 确保地图控件可见 */
.mapboxgl-ctrl-top-right {
  z-index: 1;
}

/* 防止拖拽时文本被选中 */
.map-view {
  user-select: none;
}

/* 确保地图控件在正确的位置 */
.mapboxgl-ctrl-top-right {
  right: 0 !important;
}

.mapboxgl-ctrl-bottom-right {
  right: 0 !important;
}

/* 防止地图溢出容器 */
.mapboxgl-canvas-container {
  width: 100% !important;
  height: 100% !important;
}

.mapboxgl-canvas {
  width: 100% !important;
  height: 100% !important;
}
</style> 