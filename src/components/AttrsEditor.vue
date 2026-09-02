<script setup lang="ts">
import { ref } from 'vue';

// Dumb key/value editor for the schemaless attrs object. Values are kept as
// strings unless they parse as JSON (numbers, booleans, arrays).
const props = defineProps<{ attrs: Record<string, unknown> }>();
const emit = defineEmits<{ update: [attrs: Record<string, unknown>] }>();

const newKey = ref('');
const newValue = ref('');

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
      <span class="w-28 shrink-0 truncate text-sm font-medium text-stone-600">{{ key }}</span>
      <input
        :value="displayValue(value)"
        class="min-w-0 flex-1 rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
        @change="setAttr(String(key), ($event.target as HTMLInputElement).value)"
      />
      <button
        class="px-2 text-stone-400 hover:text-red-600"
        title="Remove attribute"
        @click="removeAttr(String(key))"
      >
        ✕
      </button>
    </div>
    <form class="flex gap-2" @submit.prevent="addAttr">
      <input
        v-model="newKey"
        placeholder="attribute (e.g. rank)"
        class="w-28 shrink-0 rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
      />
      <input
        v-model="newValue"
        placeholder="value"
        class="min-w-0 flex-1 rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
      />
      <button
        type="submit"
        class="rounded bg-stone-700 px-3 py-1.5 text-sm text-white disabled:opacity-40"
        :disabled="!newKey.trim()"
      >
        Set
      </button>
    </form>
  </div>
</template>
