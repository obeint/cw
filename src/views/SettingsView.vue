<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAttributeCatalog } from '../composables/useAttributeCatalog';
import { useRelationshipRules } from '../composables/useRelationshipRules';
import { exportWorld, importWorld, parseWorldExport } from '../composables/useExportImport';
import { ENTITY_TYPES, type EntityType } from '../domain/types';
import { RELATIONSHIP_TYPES, type RelationshipType } from '../domain/relationshipTypes';
import { ENTITY_META } from '../domain/entityMeta';

// --- Attribute presets (admin panel) ---
const { catalog, addAttribute, removeAttribute, resetType, addValue, removeValue } =
  useAttributeCatalog();
const selectedType = ref<EntityType>('character');
const newAttr = ref('');
const selectedPreset = ref('');
const newPresetValue = ref('');

watch(selectedType, () => (selectedPreset.value = ''));

const activePreset = computed(() =>
  catalog.value[selectedType.value].find((p) => p.name === selectedPreset.value),
);

async function onAddAttr() {
  await addAttribute(selectedType.value, newAttr.value);
  newAttr.value = '';
}

async function onResetType() {
  if (confirm(`Reset ${ENTITY_META[selectedType.value].label} presets to the defaults?`))
    await resetType(selectedType.value);
}

async function onAddValue() {
  if (!activePreset.value) return;
  await addValue(selectedType.value, activePreset.value.name, newPresetValue.value);
  newPresetValue.value = '';
}

// --- Relationship rules (admin panel) ---
const { rules, toggle, resetType: resetRelType } = useRelationshipRules();
const selectedRel = ref<RelationshipType>('parent-of');

async function onResetRel() {
  if (confirm(`Reset the "${selectedRel.value}" rules to the defaults?`))
    await resetRelType(selectedRel.value);
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
  <div class="mx-auto flex max-w-2xl flex-col gap-3 p-3">
    <h1 class="text-xl font-bold">Settings</h1>

    <section class="card bg-base-100 shadow-sm">
      <div class="card-body gap-3 p-4">
        <h2 class="card-title text-base">Attribute presets</h2>
        <p class="text-sm opacity-60">
          Suggested attributes offered per entity type. These are shortcuts only — any attribute
          name can still be typed freely on an entity.
        </p>

        <div class="flex gap-1 overflow-x-auto">
          <button
            v-for="t in ENTITY_TYPES"
            :key="t"
            class="btn btn-xs shrink-0 rounded-full"
            :class="t === selectedType ? 'btn-primary' : 'btn-outline'"
            @click="selectedType = t"
          >
            {{ ENTITY_META[t].icon }} {{ ENTITY_META[t].label }}
          </button>
        </div>

        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="p in catalog[selectedType]"
            :key="p.name"
            class="badge badge-lg gap-1"
            :class="p.name === selectedPreset ? 'badge-primary' : 'badge-ghost'"
          >
            <button @click="selectedPreset = selectedPreset === p.name ? '' : p.name">
              {{ p.name }}<template v-if="p.values?.length"> ({{ p.values.length }})</template>
            </button>
            <button
              class="opacity-60 hover:opacity-100"
              :title="`Remove ${p.name} preset`"
              @click="removeAttribute(selectedType, p.name)"
            >
              ✕
            </button>
          </span>
          <span v-if="catalog[selectedType].length === 0" class="text-sm opacity-50">
            No presets for this type.
          </span>
        </div>

        <div v-if="activePreset" class="rounded-box bg-base-200 p-3">
          <p class="mb-1.5 text-xs opacity-70">
            Suggested values for <b>{{ activePreset.name }}</b> — offered as one-tap chips on
            entity pages:
          </p>
          <div class="mb-2 flex flex-wrap gap-1.5">
            <span
              v-for="v in activePreset.values ?? []"
              :key="v"
              class="badge gap-1 bg-base-100"
            >
              {{ v }}
              <button
                class="opacity-60 hover:opacity-100"
                :title="`Remove value ${v}`"
                @click="removeValue(selectedType, activePreset.name, v)"
              >
                ✕
              </button>
            </span>
            <span v-if="!(activePreset.values?.length)" class="text-sm opacity-50">
              No values yet — free text only.
            </span>
          </div>
          <form class="flex gap-2" @submit.prevent="onAddValue">
            <input
              v-model="newPresetValue"
              :placeholder="`New ${activePreset.name} value…`"
              class="input input-sm min-w-0 flex-1"
            />
            <button type="submit" class="btn btn-neutral btn-sm" :disabled="!newPresetValue.trim()">
              Add
            </button>
          </form>
        </div>

        <form class="flex gap-2" @submit.prevent="onAddAttr">
          <input
            v-model="newAttr"
            :placeholder="`New ${ENTITY_META[selectedType].label.toLowerCase()} attribute…`"
            class="input input-sm min-w-0 flex-1"
          />
          <button type="submit" class="btn btn-neutral btn-sm" :disabled="!newAttr.trim()">
            Add
          </button>
          <button type="button" class="btn btn-outline btn-sm" @click="onResetType">Reset</button>
        </form>
      </div>
    </section>

    <section class="card bg-base-100 shadow-sm">
      <div class="card-body gap-3 p-4">
        <h2 class="card-title text-base">Relationship rules</h2>
        <p class="text-sm opacity-60">
          Which entity types each relationship can connect. This filters the pickers on entity
          pages; existing relationships are never changed.
        </p>

        <div class="flex items-center gap-2">
          <select v-model="selectedRel" class="select select-sm w-44">
            <option v-for="t in RELATIONSHIP_TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
          <button type="button" class="btn btn-outline btn-sm" @click="onResetRel">Reset</button>
        </div>

        <div class="flex flex-col gap-2 text-sm">
          <div v-for="side in ['from', 'to'] as const" :key="side">
            <p class="mb-1 text-xs font-semibold uppercase tracking-wide opacity-60">
              {{ side === 'from' ? 'Subject can be' : 'Object can be' }}
            </p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="t in ENTITY_TYPES"
                :key="t"
                type="button"
                class="btn btn-xs rounded-full"
                :class="rules[selectedRel][side].includes(t) ? 'btn-primary' : 'btn-outline opacity-60'"
                @click="toggle(selectedRel, side, t)"
              >
                {{ ENTITY_META[t].icon }} {{ ENTITY_META[t].label }}
              </button>
            </div>
          </div>
          <p class="text-xs opacity-60">
            Reads as: <i>{{ rules[selectedRel].from.join('/') || '∅' }}</i>
            <b class="text-neutral">{{ ' ' + selectedRel + ' ' }}</b>
            <i>{{ rules[selectedRel].to.join('/') || '∅' }}</i>
          </p>
        </div>
      </div>
    </section>

    <section class="card bg-base-100 shadow-sm">
      <div class="card-body gap-3 p-4">
        <h2 class="card-title text-base">Backup</h2>
        <p class="text-sm opacity-70">
          All data lives on this device (IndexedDB). Export regularly — the JSON file is your only
          backup. It includes your attribute presets.
        </p>

        <button class="btn btn-primary self-start" @click="onExport">Export world as JSON</button>

        <label class="flex flex-col gap-1">
          <span class="font-semibold">Import a backup</span>
          <span class="text-sm opacity-60">Replaces the current world after confirmation.</span>
          <input
            ref="fileInput"
            type="file"
            accept="application/json,.json"
            class="file-input file-input-sm w-full"
            @change="onImport"
          />
        </label>

        <p v-if="status" class="alert px-3 py-2 text-sm">{{ status }}</p>
      </div>
    </section>
  </div>
</template>
