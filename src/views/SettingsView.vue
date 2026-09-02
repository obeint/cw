<script setup lang="ts">
import { ref } from 'vue';
import { useAttributeCatalog } from '../composables/useAttributeCatalog';
import { exportWorld, importWorld, parseWorldExport } from '../composables/useExportImport';
import { ENTITY_TYPES, type EntityType } from '../domain/types';
import { ENTITY_META } from '../domain/entityMeta';

// --- Attribute presets (admin panel) ---
const { catalog, addAttribute, removeAttribute, resetType } = useAttributeCatalog();
const selectedType = ref<EntityType>('character');
const newAttr = ref('');

async function onAddAttr() {
  await addAttribute(selectedType.value, newAttr.value);
  newAttr.value = '';
}

async function onResetType() {
  if (confirm(`Reset ${ENTITY_META[selectedType.value].label} presets to the defaults?`))
    await resetType(selectedType.value);
}

// --- Backup ---
const status = ref('');
const fileInput = ref<HTMLInputElement>();

async function onExport() {
  const data = await exportWorld();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `worldbuilder-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  status.value = `Exported ${data.entities.length} entities, ${data.relationships.length} relationships, ${data.notes.length} notes.`;
}

async function onImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const data = parseWorldExport(await file.text());
    const msg =
      `Import ${data.entities.length} entities, ${data.relationships.length} relationships, ` +
      `${data.notes.length} notes?\n\nThis REPLACES everything currently in this world.`;
    if (!confirm(msg)) return;
    await importWorld(data);
    status.value = 'Import complete.';
  } catch (err) {
    status.value = `Import failed: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    if (fileInput.value) fileInput.value.value = '';
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-4 p-3">
    <h1 class="text-xl font-bold">Settings</h1>

    <section class="rounded border border-stone-200 bg-white p-3">
      <h2 class="mb-1 font-semibold">Attribute presets</h2>
      <p class="mb-3 text-sm text-stone-500">
        Suggested attributes offered per entity type. These are shortcuts only — any attribute
        name can still be typed freely on an entity.
      </p>

      <div class="mb-3 flex gap-1 overflow-x-auto">
        <button
          v-for="t in ENTITY_TYPES"
          :key="t"
          class="shrink-0 rounded-full border px-3 py-1 text-sm"
          :class="
            t === selectedType
              ? 'border-amber-700 bg-amber-700 text-white'
              : 'border-stone-300 bg-white text-stone-600'
          "
          @click="selectedType = t"
        >
          {{ ENTITY_META[t].icon }} {{ ENTITY_META[t].label }}
        </button>
      </div>

      <div class="mb-3 flex flex-wrap gap-1.5">
        <span
          v-for="name in catalog[selectedType]"
          :key="name"
          class="flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-sm"
        >
          {{ name }}
          <button
            class="text-stone-400 hover:text-red-600"
            :title="`Remove ${name} preset`"
            @click="removeAttribute(selectedType, name)"
          >
            ✕
          </button>
        </span>
        <span v-if="catalog[selectedType].length === 0" class="text-sm text-stone-400">
          No presets for this type.
        </span>
      </div>

      <form class="flex gap-2" @submit.prevent="onAddAttr">
        <input
          v-model="newAttr"
          :placeholder="`New ${ENTITY_META[selectedType].label.toLowerCase()} attribute…`"
          class="min-w-0 flex-1 rounded border border-stone-300 bg-white px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          class="rounded bg-stone-700 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          :disabled="!newAttr.trim()"
        >
          Add
        </button>
        <button
          type="button"
          class="rounded border border-stone-300 px-3 py-1.5 text-sm text-stone-600"
          @click="onResetType"
        >
          Reset
        </button>
      </form>
    </section>

    <section class="rounded border border-stone-200 bg-white p-3">
      <h2 class="mb-1 font-semibold">Backup</h2>
      <p class="mb-3 text-sm text-stone-600">
        All data lives on this device (IndexedDB). Export regularly — the JSON file is your only
        backup. It includes your attribute presets.
      </p>

      <button
        class="rounded bg-amber-700 px-4 py-2 font-semibold text-white"
        @click="onExport"
      >
        Export world as JSON
      </button>

      <label class="mt-4 flex flex-col gap-1">
        <span class="font-semibold">Import a backup</span>
        <span class="text-sm text-stone-500">Replaces the current world after confirmation.</span>
        <input ref="fileInput" type="file" accept="application/json,.json" @change="onImport" />
      </label>

      <p v-if="status" class="mt-3 rounded bg-stone-200 px-3 py-2 text-sm">{{ status }}</p>
    </section>
  </div>
</template>
