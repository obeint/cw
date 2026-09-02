<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useEntities } from '../composables/useEntities';
import { ENTITY_TYPES, type EntityType } from '../domain/types';
import { ENTITY_META } from '../domain/entityMeta';
import { portraitOf } from '../utils/image';

const router = useRouter();
const typeFilter = ref<EntityType | 'all'>('all');
const search = ref('');
const { entities, createEntity } = useEntities(typeFilter);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  const list = entities.value ?? [];
  return q ? list.filter((e) => e.name.toLowerCase().includes(q)) : list;
});

const newName = ref('');
const newType = ref<EntityType>('character');

async function onCreate() {
  const name = newName.value.trim();
  if (!name) return;
  const entity = await createEntity({ type: newType.value, name });
  newName.value = '';
  router.push(`/entity/${entity.id}`);
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-3 p-3">
    <h1 class="text-xl font-bold">Entities</h1>

    <form class="flex gap-2" @submit.prevent="onCreate">
      <select v-model="newType" class="rounded border border-stone-300 bg-white px-2 py-2">
        <option v-for="t in ENTITY_TYPES" :key="t" :value="t">
          {{ ENTITY_META[t].icon }} {{ ENTITY_META[t].label }}
        </option>
      </select>
      <input
        v-model="newName"
        placeholder="New entity name…"
        class="min-w-0 flex-1 rounded border border-stone-300 bg-white px-3 py-2"
      />
      <button
        type="submit"
        class="rounded bg-amber-700 px-4 py-2 font-semibold text-white disabled:opacity-40"
        :disabled="!newName.trim()"
      >
        Add
      </button>
    </form>

    <div class="flex gap-2">
      <select v-model="typeFilter" class="rounded border border-stone-300 bg-white px-2 py-2">
        <option value="all">All types</option>
        <option v-for="t in ENTITY_TYPES" :key="t" :value="t">{{ ENTITY_META[t].label }}</option>
      </select>
      <input
        v-model="search"
        placeholder="Search by name…"
        class="min-w-0 flex-1 rounded border border-stone-300 bg-white px-3 py-2"
      />
    </div>

    <p v-if="filtered.length === 0" class="py-8 text-center text-stone-500">
      No entities yet. Add your first character, location, or faction above.
    </p>

    <ul class="divide-y divide-stone-200 overflow-hidden rounded border border-stone-200 bg-white">
      <li v-for="e in filtered" :key="e.id">
        <RouterLink
          :to="`/entity/${e.id}`"
          class="flex items-center gap-3 px-3 py-3 active:bg-stone-100"
        >
          <img
            v-if="portraitOf(e.attrs)"
            :src="portraitOf(e.attrs)"
            alt=""
            class="h-8 w-8 rounded-full border border-stone-300 object-cover"
          />
          <span v-else class="text-xl">{{ ENTITY_META[e.type].icon }}</span>
          <span class="min-w-0 flex-1 truncate font-medium">{{ e.name }}</span>
          <span
            class="rounded-full px-2 py-0.5 text-xs text-white"
            :style="{ backgroundColor: ENTITY_META[e.type].color }"
          >
            {{ ENTITY_META[e.type].label }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
