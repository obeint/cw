<script setup lang="ts">
import { ref } from 'vue';
import { computed } from 'vue';
import type { AttributePreset } from '../composables/useAttributeCatalog';

// Dumb key/value editor for the schemaless attrs object. Values are kept as
// strings unless they parse as JSON (numbers, booleans, arrays).
// `suggestions` are preset attributes for this entity's type — tappable
// chips; presets with suggested values offer tap-to-set value chips too.
// Any key and value can still be typed freely.
const props = defineProps<{ attrs: Record<string, unknown>; suggestions?: AttributePreset[] }>();
const emit = defineEmits<{ update: [attrs: Record<string, unknown>] }>();

const newKey = ref('');
const newValue = ref('');

const unusedSuggestions = computed(() =>
  (props.suggestions ?? []).filter((s) => !(s.name in props.attrs)),
);

// When the typed/tapped attribute name matches a preset with values, offer
// them as one-tap chips.
const activeValueChips = computed(() => {
  const key = newKey.value.trim();
  if (!key) return [];
  const preset = (props.suggestions ?? []).find((s) => s.name === key);
  return preset?.values ?? [];
});

function setPresetValue(value: string) {
  const key = newKey.value.trim();
  if (!key) return;
  emit('update', { ...props.attrs, [key]: value });
  newKey.value = '';
  newValue.value = '';
}

function parseValue(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function displayValue(v: unknown): string {
  return typeof v === 'string' ? v : JSON.stringify(v);
}

function setAttr(key: string, raw: string) {
  emit('update', { ...props.attrs, [key]: parseValue(raw) });
}

function removeAttr(key: string) {
  const next = { ...props.attrs };
  delete next[key];
  emit('update', next);
}

function addAttr() {
  const key = newKey.value.trim();
  if (!key) return;
  setAttr(key, newValue.value);
  newKey.value = '';
  newValue.value = '';
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-for="(value, key) in attrs" :key="key" class="flex items-center gap-2">
      <span class="w-28 shrink-0 truncate text-sm font-medium opacity-70">{{ key }}</span>
      <input
        :value="displayValue(value)"
        class="input input-sm min-w-0 flex-1"
        @change="setAttr(String(key), ($event.target as HTMLInputElement).value)"
      />
      <button
        class="btn btn-ghost btn-xs btn-circle"
        title="Remove attribute"
        @click="removeAttr(String(key))"
      >
        ✕
      </button>
    </div>
    <div v-if="unusedSuggestions.length" class="flex flex-wrap gap-1.5">
      <button
        v-for="s in unusedSuggestions"
        :key="s.name"
        type="button"
        class="btn btn-outline btn-xs rounded-full border-dashed font-normal"
        @click="newKey = s.name"
      >
        + {{ s.name }}
      </button>
    </div>
    <div v-if="activeValueChips.length" class="flex flex-wrap items-center gap-1.5">
      <span class="text-xs opacity-60">{{ newKey.trim() }}:</span>
      <button
        v-for="v in activeValueChips"
        :key="v"
        type="button"
        class="btn btn-accent btn-xs rounded-full"
        @click="setPresetValue(v)"
      >
        {{ v }}
      </button>
    </div>
    <!-- The suggestion chips above cover discovery; a datalist here would
         fight the mobile on-screen keyboard. -->
    <form class="flex gap-2" @submit.prevent="addAttr">
      <input
        v-model="newKey"
        placeholder="attribute (e.g. rank)"
        autocomplete="off"
        class="input input-sm w-28 shrink-0"
      />
      <input v-model="newValue" placeholder="value" class="input input-sm min-w-0 flex-1" />
      <button type="submit" class="btn btn-neutral btn-sm" :disabled="!newKey.trim()">Set</button>
    </form>
  </div>
</template>
