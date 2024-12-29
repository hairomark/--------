<template>
  <div class="app">
    <Home />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouteStore } from '@/stores/route'
import Home from './views/Home.vue'

const routeStore = useRouteStore()

onMounted(() => {
  routeStore.loadRoutes()
})
</script>

<style>
.app {
  height: 100vh;
  width: 100vw;
}
</style> 