import { defineStore } from 'pinia'

export const useRouteStore = defineStore('route', {
  state: () => ({
    currentRoute: null,
    loading: false,
    error: null
  }),

  actions: {
    async fetchDriverRoute(driverId) {
      this.loading = true
      try {
        const response = await fetch(`/api/drivers/${driverId}/route`)
        this.currentRoute = await response.json()
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    clearRoute() {
      this.currentRoute = null
    }
  }
}) 