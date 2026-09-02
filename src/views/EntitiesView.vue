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
      <select v-model="newType" class="select w-36 shrink-0">
        <option v-for="t in ENTITY_TYPES" :key="t" :value="t">
          {{ ENTITY_META[t].icon }} {{ ENTITY_META[t].label }}
        </option>
      </select>
      <input v-model="newName" placeholder="New entity name…" class="input min-w-0 flex-1" />
      <button type="submit" class="btn btn-primary" :disabled="!newName.trim()">Add</button>
    </form>

    <div class="flex gap-2">
      <select v-model="typeFilter" class="select select-sm w-32 shrink-0">
        <option value="all">All types</option>
        <option v-for="t in ENTITY_TYPES" :key="t" :value="t">{{ ENTITY_META[t].label }}</option>
      </select>
      <input v-model="search" placeholder="Search by name…" class="input input-sm min-w-0 flex-1" />
    </div>

    <p v-if="filtered.length === 0" class="py-8 text-center opacity-60">
      No entities yet. Add your first character, location, or faction above.
    </p>

    <ul v-else class="list rounded-box bg-base-100 shadow-sm">
      <li v-for="e in filtered" :key="e.id" class="list-row items-center p-0">
        <RouterLink
          :to="`/entity/${e.id}`"
          class="col-span-full flex items-center gap-3 px-3 py-3 active:bg-base-200"
        >
          <img
            v-if="portraitOf(e.attrs)"
            :src="portraitOf(e.attrs)"
            alt=""
            class="h-8 w-8 rounded-full border border-base-300 object-cover"
          />
          <span v-else class="text-xl">{{ ENTITY_META[e.type].icon }}</span>
          <span class="min-w-0 flex-1 truncate font-medium">{{ e.name }}</span>
          <span
            class="badge badge-sm border-0 text-white"
            :style="{ backgroundColor: ENTITY_META[e.type].color }"
          >
            {{ ENTITY_META[e.type].label }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
