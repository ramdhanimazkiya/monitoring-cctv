<template>
  <router-view />
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth.js'
import { useWebSocket } from './composables/useWebSocket.js'

const router = useRouter()
const route = useRoute()
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
      if (!route.meta?.public) {
        router.push('/login')
      }
    }
  }
)
</script>
