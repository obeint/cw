<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useEntity } from '../composables/useEntities';
import { ENTITY_TYPES } from '../domain/types';
import { ENTITY_META } from '../domain/entityMeta';
import { PORTRAIT_ATTR, portraitOf } from '../utils/image';
import { useAttributeCatalog } from '../composables/useAttributeCatalog';
import AttrsEditor from '../components/AttrsEditor.vue';
import RelationshipsPanel from '../components/RelationshipsPanel.vue';
import NotesPanel from '../components/NotesPanel.vue';
import PhotoCropModal from '../components/PhotoCropModal.vue';

const props = defineProps<{ id: string }>();
const router = useRouter();
const { entity, updateEntity, deleteEntity } = useEntity(() => props.id);

const portrait = computed(() => portraitOf(entity.value?.attrs));
const photoInput = ref<HTMLInputElement>();
const photoError = ref('');
const { catalog } = useAttributeCatalog();
const attrSuggestions = computed(() =>
  entity.value ? catalog.value[entity.value.type] : [],
);

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

const pendingPhoto = ref<File | null>(null);

function onPhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file && entity.value) {
    photoError.value = '';
    pendingPhoto.value = file; // opens the crop dialog
  }
  if (photoInput.value) photoInput.value.value = '';
}

async function onCropDone(dataUrl: string) {
  pendingPhoto.value = null;
  if (!entity.value) return;
  await updateEntity(entity.value.id, {
    attrs: { ...entity.value.attrs, [PORTRAIT_ATTR]: dataUrl },
  });
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
  <div v-if="entity" class="mx-auto flex max-w-2xl flex-col gap-3 p-3">
    <div class="flex items-center gap-2">
      <button class="btn btn-ghost btn-sm btn-circle" title="Back" @click="router.back()">←</button>
      <img
        v-if="portrait"
        :src="portrait"
        alt=""
        class="h-9 w-9 rounded-full border border-base-300 object-cover"
      />
      <span v-else class="text-2xl">{{ ENTITY_META[entity.type].icon }}</span>
      <input
        :value="entity.name"
        class="input input-ghost min-w-0 flex-1 px-2 text-xl font-bold"
        @change="updateEntity(entity.id, { name: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <div class="flex items-center gap-2">
      <label class="text-sm opacity-70">Type</label>
      <select
        :value="entity.type"
        class="select select-sm w-36"
        @change="updateEntity(entity.id, { type: ($event.target as HTMLSelectElement).value as typeof entity.type })"
      >
        <option v-for="t in ENTITY_TYPES" :key="t" :value="t">{{ ENTITY_META[t].label }}</option>
      </select>
      <RouterLink
        v-if="entity.type === 'character'"
        :to="`/lineage/${entity.id}`"
        class="btn btn-sm ml-auto"
      >
        🌳 Lineage
      </RouterLink>
    </div>

    <section class="card bg-base-100 shadow-sm">
      <div class="card-body gap-3 p-4">
        <h2 class="card-title text-base">Photo</h2>
        <div class="flex items-center gap-4">
          <img
            v-if="portrait"
            :src="portrait"
            alt=""
            class="h-20 w-20 rounded-full border border-base-300 object-cover"
          />
          <span
            v-else
            class="flex h-20 w-20 items-center justify-center rounded-full bg-base-200 text-3xl"
          >
            {{ ENTITY_META[entity.type].icon }}
          </span>
          <div class="flex flex-col items-start gap-2">
            <label class="btn btn-neutral btn-sm">
              {{ portrait ? 'Replace photo' : 'Add photo' }}
              <input
                ref="photoInput"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onPhoto"
              />
            </label>
            <button v-if="portrait" class="btn btn-outline btn-error btn-sm" @click="onRemovePhoto">
              Remove photo
            </button>
          </div>
        </div>
        <p v-if="photoError" class="text-sm text-error">{{ photoError }}</p>
      </div>
    </section>

    <section class="card bg-base-100 shadow-sm">
      <div class="card-body gap-3 p-4">
        <h2 class="card-title text-base">Attributes</h2>
        <AttrsEditor :attrs="editableAttrs" :suggestions="attrSuggestions" @update="onAttrsUpdate" />
      </div>
    </section>

    <section class="card bg-base-100 shadow-sm">
      <div class="card-body gap-3 p-4">
        <h2 class="card-title text-base">Relationships</h2>
        <!-- Keyed so draft form state resets when navigating between entities -->
        <RelationshipsPanel
          :key="entity.id"
          :entity-id="entity.id"
          :entity-name="entity.name"
          :entity-type="entity.type"
        />
      </div>
    </section>

    <section class="card bg-base-100 shadow-sm">
      <div class="card-body gap-3 p-4">
        <h2 class="card-title text-base">Notes</h2>
        <NotesPanel :key="entity.id" :entity-id="entity.id" />
      </div>
    </section>

    <button class="btn btn-outline btn-error self-start" @click="onDelete">Delete entity</button>

    <PhotoCropModal
      v-if="pendingPhoto"
      :file="pendingPhoto"
      @done="onCropDone"
      @cancel="pendingPhoto = null"
    />
  </div>
  <p v-else class="p-6 text-center opacity-60">Entity not found.</p>
</template>
