<template>
  <router-view />
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useAuthStore } from './stores/auth.js'
import { useWebSocket } from './composables/useWebSocket.js'

const authStore = useAuthStore()
const { initSocket, disconnectSocket } = useWebSocket()

onMounted(() => {
  if (authStore.isAuthenticated) {
    authStore.fetchCurrentUser()
    initSocket()
  }
})

watch(
  () => authStore.isAuthenticated,
  (isAuth) => {
    if (isAuth) {
      initSocket()
    } else {
      disconnectSocket()
    }
  }
)
</script>
