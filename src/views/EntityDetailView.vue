<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useEntity } from '../composables/useEntities';
import { ENTITY_TYPES } from '../domain/types';
import { ENTITY_META } from '../domain/entityMeta';
import AttrsEditor from '../components/AttrsEditor.vue';
import RelationshipsPanel from '../components/RelationshipsPanel.vue';
import NotesPanel from '../components/NotesPanel.vue';

const props = defineProps<{ id: string }>();
const router = useRouter();
const { entity, updateEntity, deleteEntity } = useEntity(() => props.id);

async function onDelete() {
  if (!entity.value) return;
  const msg = `Delete "${entity.value.name}" and all of its relationships and notes? This cannot be undone.`;
  if (!confirm(msg)) return;
  await deleteEntity(entity.value.id);
  router.replace('/');
}
</script>

<template>
  <div v-if="entity" class="mx-auto flex max-w-2xl flex-col gap-4 p-3">
    <div class="flex items-center gap-2">
      <button class="px-1 text-lg" title="Back" @click="router.back()">←</button>
      <span class="text-2xl">{{ ENTITY_META[entity.type].icon }}</span>
      <input
        :value="entity.name"
        class="min-w-0 flex-1 rounded border border-transparent bg-transparent px-2 py-1 text-xl font-bold focus:border-stone-300 focus:bg-white"
        @change="updateEntity(entity.id, { name: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <div class="flex items-center gap-2">
      <label class="text-sm text-stone-600">Type</label>
      <select
        :value="entity.type"
        class="rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
        @change="updateEntity(entity.id, { type: ($event.target as HTMLSelectElement).value as typeof entity.type })"
      >
        <option v-for="t in ENTITY_TYPES" :key="t" :value="t">{{ ENTITY_META[t].label }}</option>
      </select>
      <RouterLink
        v-if="entity.type === 'character'"
        :to="`/lineage/${entity.id}`"
        class="ml-auto rounded border border-stone-300 bg-white px-3 py-1.5 text-sm"
      >
        🌳 Lineage
      </RouterLink>
    </div>

    <section class="rounded border border-stone-200 bg-white p-3">
      <h2 class="mb-2 font-semibold">Attributes</h2>
      <AttrsEditor :attrs="entity.attrs" @update="updateEntity(entity.id, { attrs: $event })" />
    </section>

    <section class="rounded border border-stone-200 bg-white p-3">
      <h2 class="mb-2 font-semibold">Relationships</h2>
      <!-- Keyed so draft form state resets when navigating between entities -->
      <RelationshipsPanel :key="entity.id" :entity-id="entity.id" :entity-name="entity.name" />
    </section>

    <section class="rounded border border-stone-200 bg-white p-3">
      <h2 class="mb-2 font-semibold">Notes</h2>
      <NotesPanel :key="entity.id" :entity-id="entity.id" />
    </section>

    <button
      class="self-start rounded border border-red-300 px-3 py-1.5 text-sm text-red-700"
      @click="onDelete"
    >
      Delete entity
    </button>
  </div>
  <p v-else class="p-6 text-center text-stone-500">Entity not found.</p>
</template>
