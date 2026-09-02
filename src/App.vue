<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';

const tabs = [
  { to: '/', label: 'Entities', icon: '📜' },
  { to: '/graph', label: 'Graph', icon: '🕸️' },
  { to: '/lineage', label: 'Lineage', icon: '🌳' },
  { to: '/places', label: 'Places', icon: '🗺️' },
  { to: '/timeline', label: 'Timeline', icon: '⏳' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];
</script>

<template>
  <div class="flex h-full flex-col bg-base-200 text-base-content">
    <main class="min-h-0 flex-1 overflow-y-auto">
      <RouterView />
    </main>
    <nav
      class="dock static shrink-0 border-t border-base-300 bg-base-100 pb-[env(safe-area-inset-bottom)]"
    >
      <RouterLink v-for="tab in tabs" :key="tab.to" :to="tab.to" active-class="dock-active">
        <span class="text-lg leading-none">{{ tab.icon }}</span>
        <span class="dock-label">{{ tab.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>
