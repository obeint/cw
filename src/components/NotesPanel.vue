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
        class="textarea min-w-0 flex-1"
      ></textarea>
      <button type="submit" class="btn btn-neutral btn-sm self-end" :disabled="!draft.trim()">
        Add
      </button>
    </form>
    <ul class="flex flex-col gap-1.5">
      <li
        v-for="note in notes ?? []"
        :key="note.id"
        class="flex items-start gap-2 rounded-box bg-base-200 px-3 py-2 text-sm"
      >
        <div class="min-w-0 flex-1">
          <p class="whitespace-pre-wrap">{{ note.text }}</p>
          <p class="mt-0.5 text-xs opacity-50">
            {{ new Date(note.createdAt).toLocaleString() }}
          </p>
        </div>
        <button
          class="btn btn-ghost btn-xs btn-circle"
          title="Delete note"
          @click="onDelete(note.id)"
        >
          ✕
        </button>
      </li>
    </ul>
  </div>
</template>
