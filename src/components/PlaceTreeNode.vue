<script setup lang="ts">
import type { PlaceNode } from './placeTree';
import { ENTITY_META } from '../domain/entityMeta';

defineProps<{ node: PlaceNode }>();
</script>

<template>
  <li>
    <RouterLink
      :to="`/entity/${node.entity.id}`"
      class="flex items-center gap-2 rounded px-2 py-1.5 active:bg-stone-100"
    >
      <span>{{ ENTITY_META[node.entity.type].icon }}</span>
      <span class="font-medium">{{ node.entity.name }}</span>
    </RouterLink>
    <ul v-if="node.children.length" class="ml-5 border-l border-stone-200 pl-2">
      <PlaceTreeNode v-for="child in node.children" :key="child.entity.id" :node="child" />
    </ul>
  </li>
</template>
