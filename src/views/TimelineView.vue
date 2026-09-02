<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useEntities } from '../composables/useEntities';
import { useAllRelationships } from '../composables/useRelationships';
import { ENTITY_META } from '../domain/entityMeta';
import { portraitOf } from '../utils/image';
import type { Entity } from '../domain/types';

// Timeline is a derived view: event entities ordered by attrs.year, with
// involved entities (involved-in edges) and places (located-in edges).
const router = useRouter();
const { entities, createEntity } = useEntities();
const { relationships } = useAllRelationships();

function yearOf(e: Entity): number | undefined {
  const y = Number(e.attrs.year);
  return Number.isFinite(y) ? y : undefined;
}

function dateLabel(e: Entity): string {
  const date = e.attrs.date;
  if (typeof date === 'string' && date.trim()) return date;
  const y = yearOf(e);
  return y !== undefined ? `Year ${y}` : 'Undated';
}

interface TimelineEntry {
  event: Entity;
  involved: Entity[];
  places: Entity[];
}

const timeline = computed<TimelineEntry[]>(() => {
  const all = entities.value ?? [];
  const rels = relationships.value ?? [];
  const byId = new Map(all.map((e) => [e.id, e]));

  return all
    .filter((e) => e.type === 'event')
    .map((event) => ({
      event,
      involved: rels
        .filter((r) => r.type === 'involved-in' && r.toId === event.id)
        .map((r) => byId.get(r.fromId))
        .filter((x): x is Entity => x !== undefined),
      places: rels
        .filter((r) => r.type === 'located-in' && r.fromId === event.id)
        .map((r) => byId.get(r.toId))
        .filter((x): x is Entity => x !== undefined),
    }))
    .sort((a, b) => {
      const ya = yearOf(a.event);
      const yb = yearOf(b.event);
      if (ya === undefined && yb === undefined)
        return a.event.name.localeCompare(b.event.name);
      if (ya === undefined) return 1; // undated events sink to the bottom
      if (yb === undefined) return -1;
      return ya - yb;
    });
});

const newName = ref('');
// v-model on a number input yields number | '' — keep it loose and normalize.
const newYear = ref<string | number>('');
const newDate = ref('');

async function onCreate() {
  const name = newName.value.trim();
  if (!name) return;
  const attrs: Record<string, unknown> = {};
  const yearRaw = String(newYear.value).trim();
  const y = Number(yearRaw);
  if (yearRaw && Number.isFinite(y)) attrs.year = y;
  if (newDate.value.trim()) attrs.date = newDate.value.trim();
  const event = await createEntity({ type: 'event', name, attrs });
  newName.value = newDate.value = '';
  newYear.value = '';
  router.push(`/entity/${event.id}`);
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-3 p-3">
    <h1 class="text-xl font-bold">Timeline</h1>

    <form
      class="flex flex-col gap-2 rounded border border-stone-200 bg-white p-3"
      @submit.prevent="onCreate"
    >
      <div class="flex gap-2">
        <input
          v-model="newName"
          placeholder="New event name…"
          class="min-w-0 flex-1 rounded border border-stone-300 bg-white px-3 py-2"
        />
        <button
          type="submit"
          class="rounded bg-amber-700 px-4 py-2 font-semibold text-white disabled:opacity-40"
          :disabled="!newName.trim()"
        >
          Add
        </button>
      </div>
      <div class="flex gap-2">
        <input
          v-model="newYear"
          type="number"
          placeholder="Year (for ordering)"
          class="w-40 rounded border border-stone-300 bg-white px-3 py-2 text-sm"
        />
        <input
          v-model="newDate"
          placeholder="Display date, e.g. TA 2941 (optional)"
          class="min-w-0 flex-1 rounded border border-stone-300 bg-white px-3 py-2 text-sm"
        />
      </div>
      <p class="text-xs text-stone-500">
        The numeric year orders the timeline; the display date is free text. Link who was involved
        from the event's page with <i>involved-in</i>.
      </p>
    </form>

    <p v-if="timeline.length === 0" class="py-8 text-center text-stone-500">
      No events yet. Add your first battle, founding, or coronation above.
    </p>

    <ol v-else class="ml-2 flex flex-col gap-4 border-l-2 border-amber-700/40 pl-4">
      <li v-for="entry in timeline" :key="entry.event.id" class="relative">
        <span
          class="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-amber-700 bg-stone-100"
        ></span>
        <p class="text-xs font-semibold uppercase tracking-wide text-amber-800">
          {{ dateLabel(entry.event) }}
        </p>
        <RouterLink
          :to="`/entity/${entry.event.id}`"
          class="font-semibold underline decoration-stone-300 underline-offset-2"
        >
          {{ ENTITY_META.event.icon }} {{ entry.event.name }}
        </RouterLink>
        <p v-if="entry.places.length" class="text-sm text-stone-500">
          at
          <template v-for="(place, i) in entry.places" :key="place.id">
            <RouterLink :to="`/entity/${place.id}`" class="underline">{{ place.name }}</RouterLink
            ><template v-if="i < entry.places.length - 1">, </template>
          </template>
        </p>
        <div v-if="entry.involved.length" class="mt-1 flex flex-wrap gap-1.5">
          <RouterLink
            v-for="who in entry.involved"
            :key="who.id"
            :to="`/entity/${who.id}`"
            class="flex items-center gap-1 rounded-full border border-stone-300 bg-white px-2 py-0.5 text-xs"
          >
            <img
              v-if="portraitOf(who.attrs)"
              :src="portraitOf(who.attrs)"
              alt=""
              class="h-4 w-4 rounded-full object-cover"
            />
            <span v-else>{{ ENTITY_META[who.type].icon }}</span>
            {{ who.name }}
          </RouterLink>
        </div>
      </li>
    </ol>
  </div>
</template>
