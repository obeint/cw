<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';

const tabs = [
  { to: '/', label: 'Entities', icon: '📜' },
  { to: '/graph', label: 'Graph', icon: '🕸️' },
  { to: '/lineage', label: 'Lineage', icon: '🌳' },
  { to: '/places', label: 'Places', icon: '🗺️' },
  { to: '/backup', label: 'Backup', icon: '💾' },
];
</script>

<template>
  <div class="flex h-full flex-col bg-stone-100 text-stone-900">
    <main class="min-h-0 flex-1 overflow-y-auto">
      <RouterView />
    </main>
    <nav
      class="flex shrink-0 border-t border-stone-300 bg-stone-50 pb-[env(safe-area-inset-bottom)]"
    >
      <RouterLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs text-stone-500"
        active-class="!text-amber-700 font-semibold"
      >
        <span class="text-lg leading-none">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>
