<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useEntity } from '../composables/useEntities';
import { ENTITY_TYPES } from '../domain/types';
import { ENTITY_META } from '../domain/entityMeta';
import { PORTRAIT_ATTR, portraitOf, fileToPortraitDataUrl } from '../utils/image';
import { useAttributeCatalog } from '../composables/useAttributeCatalog';
import AttrsEditor from '../components/AttrsEditor.vue';
import RelationshipsPanel from '../components/RelationshipsPanel.vue';
import NotesPanel from '../components/NotesPanel.vue';

const props = defineProps<{ id: string }>();
const router = useRouter();
const { entity, updateEntity, deleteEntity } = useEntity(() => props.id);

const portrait = computed(() => portraitOf(entity.value?.attrs));
const { catalog } = useAttributeCatalog();
const attrSuggestions = computed(() =>
  entity.value ? catalog.value[entity.value.type] : [],
);
const photoInput = ref<HTMLInputElement>();
const photoError = ref('');

// The portrait is managed by the photo UI below, so keep it out of the
// key/value attrs editor and merge it back on every attrs update.
const editableAttrs = computed(() => {
  const { [PORTRAIT_ATTR]: _portrait, ...rest } = entity.value?.attrs ?? {};
  return rest;
});

function onAttrsUpdate(next: Record<string, unknown>) {
  if (!entity.value) return;
  const current = portraitOf(entity.value.attrs);
  updateEntity(entity.value.id, {
    attrs: current ? { ...next, [PORTRAIT_ATTR]: current } : next,
  });
}

async function onPhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !entity.value) return;
  photoError.value = '';
  try {
    const dataUrl = await fileToPortraitDataUrl(file);
    await updateEntity(entity.value.id, {
      attrs: { ...entity.value.attrs, [PORTRAIT_ATTR]: dataUrl },
    });
  } catch (err) {
    photoError.value = `Could not read that image: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    if (photoInput.value) photoInput.value.value = '';
  }
}

async function onRemovePhoto() {
  if (!entity.value || !confirm('Remove this photo?')) return;
  const { [PORTRAIT_ATTR]: _portrait, ...rest } = entity.value.attrs;
  await updateEntity(entity.value.id, { attrs: rest });
}

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
      <img
        v-if="portrait"
        :src="portrait"
        alt=""
        class="h-9 w-9 rounded-full border border-stone-300 object-cover"
      />
      <span v-else class="text-2xl">{{ ENTITY_META[entity.type].icon }}</span>
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
      <h2 class="mb-2 font-semibold">Photo</h2>
      <div class="flex items-center gap-4">
        <img
          v-if="portrait"
          :src="portrait"
          alt=""
          class="h-20 w-20 rounded-full border border-stone-300 object-cover"
        />
        <span
          v-else
          class="flex h-20 w-20 items-center justify-center rounded-full bg-stone-100 text-3xl"
        >
          {{ ENTITY_META[entity.type].icon }}
        </span>
        <div class="flex flex-col items-start gap-2">
          <label
            class="cursor-pointer rounded bg-stone-700 px-3 py-1.5 text-sm text-white"
          >
            {{ portrait ? 'Replace photo' : 'Add photo' }}
            <input
              ref="photoInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onPhoto"
            />
          </label>
          <button
            v-if="portrait"
            class="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700"
            @click="onRemovePhoto"
          >
            Remove photo
          </button>
        </div>
      </div>
      <p v-if="photoError" class="mt-2 text-sm text-red-700">{{ photoError }}</p>
    </section>

    <section class="rounded border border-stone-200 bg-white p-3">
      <h2 class="mb-2 font-semibold">Attributes</h2>
      <AttrsEditor :attrs="editableAttrs" :suggestions="attrSuggestions" @update="onAttrsUpdate" />
    </section>

    <section class="rounded border border-stone-200 bg-white p-3">
      <h2 class="mb-2 font-semibold">Relationships</h2>
      <!-- Keyed so draft form state resets when navigating between entities -->
      <RelationshipsPanel
        :key="entity.id"
        :entity-id="entity.id"
        :entity-name="entity.name"
        :entity-type="entity.type"
      />
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
