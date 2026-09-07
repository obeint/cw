<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useEntities } from '../composables/useEntities';
import { useAllRelationships } from '../composables/useRelationships';
import { ENTITY_META } from '../domain/entityMeta';
import { STORY_TEXT_ATTR } from '../domain/attributeDefaults';
import { portraitOf } from '../utils/image';
import { useDisplayNames } from '../composables/useDisplayNames';
import type { Entity } from '../domain/types';

// Stories are entities of type 'story': the scene's location hangs off a
// located-in edge, the people involved off involved-in edges, the date lives
// in attrs, and the draft text in attrs.text — all existing machinery.
const router = useRouter();
const { entities, createEntity } = useEntities();
const { relationships } = useAllRelationships();
const { displayNameOf } = useDisplayNames();

interface StoryEntry {
  story: Entity;
  involved: Entity[];
  places: Entity[];
}

const stories = computed<StoryEntry[]>(() => {
  const all = entities.value ?? [];
  const rels = relationships.value ?? [];
  const byId = new Map(all.map((e) => [e.id, e]));

  return all
    .filter((e) => e.type === 'story')
    .map((story) => ({
      story,
      involved: rels
        .filter((r) => r.type === 'involved-in' && r.toId === story.id)
        .map((r) => byId.get(r.fromId))
        .filter((x): x is Entity => x !== undefined),
      places: rels
        .filter((r) => r.type === 'located-in' && r.fromId === story.id)
        .map((r) => byId.get(r.toId))
        .filter((x): x is Entity => x !== undefined),
    }))
    .sort((a, b) => b.story.updatedAt - a.story.updatedAt); // latest draft first
});

function dateLabel(e: Entity): string {
  const date = e.attrs.date;
  if (typeof date === 'string' && date.trim()) return date;
  const y = Number(e.attrs.year);
  return Number.isFinite(y) ? `Year ${y}` : '';
}

function excerpt(e: Entity): string {
  const t = e.attrs[STORY_TEXT_ATTR];
  if (typeof t !== 'string' || !t.trim()) return '';
  const clean = t.trim().replace(/\s+/g, ' ');
  return clean.length > 140 ? clean.slice(0, 139) + '…' : clean;
}

const newTitle = ref('');

async function onCreate() {
  const name = newTitle.value.trim();
  if (!name) return;
  const story = await createEntity({ type: 'story', name });
  newTitle.value = '';
  router.push(`/entity/${story.id}`);
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-3 p-3">
    <h1 class="text-xl font-bold">Stories</h1>

    <form class="flex gap-2" @submit.prevent="onCreate">
      <input
        v-model="newTitle"
        placeholder="New scene… e.g. Secret meeting at the inn"
        class="input min-w-0 flex-1"
      />
      <button type="submit" class="btn btn-primary" :disabled="!newTitle.trim()">Draft</button>
    </form>
    <p class="text-xs opacity-60">
      A scene opens as its own page: write the details there, and link its location
      (<i>located-in</i>) and the people involved (<i>involves</i>).
    </p>

    <p v-if="stories.length === 0" class="py-8 text-center opacity-60">
      No scenes yet. Draft your first one above — a meeting, a betrayal, a battle's eve.
    </p>

    <div
      v-for="entry in stories"
      :key="entry.story.id"
      class="card cursor-pointer bg-base-100 shadow-sm active:bg-base-200"
      @click="router.push(`/entity/${entry.story.id}`)"
    >
      <div class="card-body gap-1.5 p-4">
        <div class="flex items-baseline justify-between gap-2">
          <h2 class="card-title min-w-0 flex-1 truncate text-base">
            {{ ENTITY_META.story.icon }} {{ entry.story.name }}
          </h2>
          <span v-if="dateLabel(entry.story)" class="shrink-0 text-xs font-semibold text-neutral">
            {{ dateLabel(entry.story) }}
          </span>
        </div>
        <p v-if="entry.places.length" class="text-sm opacity-70">
          {{ ENTITY_META.location.icon }} {{ entry.places.map((p) => p.name).join(', ') }}
        </p>
        <p v-if="excerpt(entry.story)" class="text-sm opacity-80">{{ excerpt(entry.story) }}</p>
        <p v-else class="text-sm italic opacity-40">No details written yet.</p>
        <div v-if="entry.involved.length" class="mt-0.5 flex flex-wrap gap-1.5">
          <span
            v-for="who in entry.involved"
            :key="who.id"
            class="badge badge-outline badge-sm gap-1"
          >
            <img
              v-if="portraitOf(who.attrs)"
              :src="portraitOf(who.attrs)"
              alt=""
              class="h-4 w-4 rounded-full object-cover"
            />
            <span v-else>{{ ENTITY_META[who.type].icon }}</span>
            {{ displayNameOf(who.id) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
