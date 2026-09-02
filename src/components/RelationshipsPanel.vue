<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRelationships } from '../composables/useRelationships';
import { useEntities } from '../composables/useEntities';
import { useRelationshipRules } from '../composables/useRelationshipRules';
import { RELATIONSHIP_TYPES, type RelationshipType } from '../domain/relationshipTypes';
import { INVERSE_LABELS } from '../domain/relationshipDefaults';
import { ENTITY_META } from '../domain/entityMeta';
import type { EntityType, Relationship } from '../domain/types';

const props = defineProps<{ entityId: string; entityName: string; entityType: EntityType }>();

const { outgoing, incoming, createRelationship, deleteRelationship } = useRelationships(
  () => props.entityId,
);
const { entities } = useEntities();
const { rules } = useRelationshipRules();

const nameOf = computed(() => {
  const map = new Map<string, string>();
  for (const e of entities.value ?? []) map.set(e.id, e.name);
  return (id: string) => map.get(id) ?? '(deleted)';
});

// The current entity always reads as the sentence's subject: an incoming
// parent-of edge displays with its inverse phrasing ("offspring-of").
// Symmetric types read the same either way.
function displayLabel(rel: Relationship): string {
  if (rel.fromId === props.entityId) return rel.type;
  return INVERSE_LABELS[rel.type] ?? rel.type;
}

// One dropdown covers both directions: forward kinds where this entity can
// be the subject, and inverse phrasings ("offspring-of" for parent-of) where
// it can be the object. Picking an inverse stores the canonical edge with
// subject and object swapped — nothing new is stored.
interface DirectionOption {
  key: string;
  type: RelationshipType;
  reversed: boolean;
  label: string;
}

const options = computed<DirectionOption[]>(() => {
  const out: DirectionOption[] = [];
  for (const t of RELATIONSHIP_TYPES) {
    if (rules.value[t].from.includes(props.entityType))
      out.push({ key: `fwd:${t}`, type: t, reversed: false, label: t });
    const inverse = INVERSE_LABELS[t];
    if (inverse && rules.value[t].to.includes(props.entityType))
      out.push({ key: `rev:${t}`, type: t, reversed: true, label: inverse });
  }
  return out;
});

const selectedKey = ref('');
watch(
  options,
  (opts) => {
    if (opts.length > 0 && !opts.some((o) => o.key === selectedKey.value))
      selectedKey.value = opts[0]!.key;
  },
  { immediate: true },
);
const selected = computed(() => options.value.find((o) => o.key === selectedKey.value));

const targetName = ref('');
const targetFocused = ref(false);

// Candidate targets are entities whose type fits the other side of the edge.
const targetCandidates = computed(() => {
  const sel = selected.value;
  if (!sel) return [];
  const otherSide = rules.value[sel.type][sel.reversed ? 'from' : 'to'];
  return (entities.value ?? []).filter(
    (e) => e.id !== props.entityId && otherSide.includes(e.type),
  );
});

// In-page suggestion list (native <datalist> is unusable on mobile: its
// popup floats over the on-screen keyboard and steals focus). Rendered in
// normal flow below the field, filtered as the user types.
const suggestions = computed(() => {
  const q = targetName.value.trim().toLowerCase();
  const matches = q
    ? targetCandidates.value.filter((e) => e.name.toLowerCase().includes(q))
    : targetCandidates.value;
  return matches.slice(0, 6);
});

const targetId = computed(() => {
  const name = targetName.value.trim().toLowerCase();
  return targetCandidates.value.find((e) => e.name.toLowerCase() === name)?.id;
});

function pickTarget(name: string) {
  targetName.value = name;
  targetFocused.value = false;
}

async function onAdd() {
  const sel = selected.value;
  if (!sel || !targetId.value) return;
  await createRelationship({
    fromId: sel.reversed ? targetId.value : props.entityId,
    toId: sel.reversed ? props.entityId : targetId.value,
    type: sel.type,
  });
  targetName.value = '';
}

async function onDelete(rel: Relationship) {
  const sentence = `${nameOf.value(rel.fromId)} ${rel.type} ${nameOf.value(rel.toId)}`;
  if (confirm(`Delete relationship "${sentence}"?`)) await deleteRelationship(rel.id);
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <ul class="flex flex-col gap-1">
      <li
        v-for="rel in [...(outgoing ?? []), ...(incoming ?? [])]"
        :key="rel.id"
        class="flex items-center gap-2 rounded-box bg-base-200 px-3 py-1.5 text-sm"
      >
        <!-- The page's entity is the implied subject; repeating its name in
             every row just truncates away the informative part. -->
        <span class="min-w-0 flex-1 truncate">
          <i class="text-neutral">{{ displayLabel(rel) + ' ' }}</i>
          <RouterLink
            :to="`/entity/${rel.fromId === entityId ? rel.toId : rel.fromId}`"
            class="link font-medium"
            >{{ nameOf(rel.fromId === entityId ? rel.toId : rel.fromId) }}</RouterLink
          >
        </span>
        <button
          class="btn btn-ghost btn-xs btn-circle"
          title="Delete relationship"
          @click="onDelete(rel)"
        >
          ✕
        </button>
      </li>
    </ul>
    <p v-if="!(outgoing?.length || incoming?.length)" class="text-sm opacity-60">
      No relationships yet.
    </p>

    <p v-if="options.length === 0" class="text-sm opacity-60">
      No relationship kinds apply to this entity type — adjust the rules in Settings.
    </p>
    <form v-else class="flex flex-col gap-2" @submit.prevent="onAdd">
      <div class="flex flex-wrap items-center gap-2">
        <b class="max-w-[38%] truncate text-sm">{{ entityName }}</b>
        <select v-model="selectedKey" class="select select-sm w-36">
          <option v-for="o in options" :key="o.key" :value="o.key">{{ o.label }}</option>
        </select>
        <input
          v-model="targetName"
          placeholder="other entity…"
          autocomplete="off"
          class="input input-sm min-w-32 flex-1"
          @focus="targetFocused = true"
          @blur="targetFocused = false"
        />
        <button type="submit" class="btn btn-neutral btn-sm" :disabled="!targetId">Link</button>
      </div>
      <!-- mousedown.prevent keeps the input's blur from firing before the pick -->
      <ul
        v-if="targetFocused && !targetId && suggestions.length"
        class="menu menu-sm w-full gap-0.5 rounded-box border border-base-300 bg-base-100 p-1"
      >
        <li v-for="e in suggestions" :key="e.id">
          <button type="button" class="flex items-center gap-2" @mousedown.prevent="pickTarget(e.name)">
            <span>{{ ENTITY_META[e.type].icon }}</span>
            <span class="min-w-0 flex-1 truncate">{{ e.name }}</span>
            <span class="text-xs opacity-50">{{ ENTITY_META[e.type].label }}</span>
          </button>
        </li>
      </ul>
      <p v-else-if="targetFocused && !targetId && targetName.trim()" class="text-xs opacity-50">
        No matching entity — check the name, or create it on the Entities tab first.
      </p>
    </form>
  </div>
</template>
