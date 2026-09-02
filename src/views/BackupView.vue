<script setup lang="ts">
import { ref } from 'vue';
import { exportWorld, importWorld, parseWorldExport } from '../composables/useExportImport';

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
    <h1 class="text-xl font-bold">Backup</h1>
    <p class="text-sm text-stone-600">
      All data lives on this device (IndexedDB). Export regularly — the JSON file is your only
      backup.
    </p>

    <button
      class="self-start rounded bg-amber-700 px-4 py-2 font-semibold text-white"
      @click="onExport"
    >
      Export world as JSON
    </button>

    <label class="flex flex-col gap-1">
      <span class="font-semibold">Import a backup</span>
      <span class="text-sm text-stone-500">Replaces the current world after confirmation.</span>
      <input ref="fileInput" type="file" accept="application/json,.json" @change="onImport" />
    </label>

    <p v-if="status" class="rounded bg-stone-200 px-3 py-2 text-sm">{{ status }}</p>
  </div>
</template>
