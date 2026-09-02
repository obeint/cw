<script setup lang="ts">
import { ref } from 'vue';
import { useNotes } from '../composables/useNotes';

const props = defineProps<{ entityId: string }>();
const { notes, createNote, deleteNote } = useNotes(() => props.entityId);

const draft = ref('');

async function onAdd() {
  const text = draft.value.trim();
  if (!text) return;
  await createNote(text);
  draft.value = '';
}

async function onDelete(id: string) {
  if (confirm('Delete this note?')) await deleteNote(id);
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <form class="flex gap-2" @submit.prevent="onAdd">
      <textarea
        v-model="draft"
        rows="2"
        placeholder="Add a note…"
        class="min-w-0 flex-1 rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
      ></textarea>
      <button
        type="submit"
        class="self-end rounded bg-stone-700 px-3 py-1.5 text-sm text-white disabled:opacity-40"
        :disabled="!draft.trim()"
      >
        Add
      </button>
    </form>
    <ul class="flex flex-col gap-1">
      <li
        v-for="note in notes ?? []"
        :key="note.id"
        class="flex items-start gap-2 rounded bg-stone-50 px-2 py-1.5 text-sm"
      >
        <div class="min-w-0 flex-1">
          <p class="whitespace-pre-wrap">{{ note.text }}</p>
          <p class="mt-0.5 text-xs text-stone-400">
            {{ new Date(note.createdAt).toLocaleString() }}
          </p>
        </div>
        <button
          class="px-1 text-stone-400 hover:text-red-600"
          title="Delete note"
          @click="onDelete(note.id)"
        >
          ✕
        </button>
      </li>
    </ul>
  </div>
</template>
