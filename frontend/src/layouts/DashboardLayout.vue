<template>
  <div class="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col antialiased">
    <!-- Main wrapper -->
    <div class="flex-1 flex">
      <!-- Desktop Sidebar -->
      <AppSidebar
        class="hidden lg:flex"
        :collapsed="sidebarCollapsed"
        @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
      />

      <!-- Mobile Sidebar Overlay & Drawer -->
      <div
        v-if="mobileSidebarOpen"
        class="fixed inset-0 z-40 bg-black/80 lg:hidden backdrop-blur-xs"
        @click="mobileSidebarOpen = false"
      >
        <div class="w-64 h-full" @click.stop>
          <AppSidebar
            :collapsed="false"
            @toggle-collapse="mobileSidebarOpen = false"
          />
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <AppHeader @toggle-mobile-sidebar="mobileSidebarOpen = !mobileSidebarOpen" />

        <main class="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <router-view />
        </main>
      </div>
    </div>

    <!-- Global Toast Notifications -->
    <ToastContainer />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import AppHeader from '../components/layout/AppHeader.vue'
import ToastContainer from '../components/ui/ToastContainer.vue'

const sidebarCollapsed = ref(false)
const mobileSidebarOpen = ref(false)
</script>
