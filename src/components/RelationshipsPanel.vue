<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRelationships } from '../composables/useRelationships';
import { useEntities } from '../composables/useEntities';
import { useRelationshipRules } from '../composables/useRelationshipRules';
import { RELATIONSHIP_TYPES, type RelationshipType } from '../domain/relationshipTypes';
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

const newType = ref<RelationshipType>('parent-of');
const targetName = ref('');
const reversed = ref(false); // reversed: other entity is the subject

// Only offer relationship kinds that apply to this entity's type on the side
// it currently plays (subject normally, object when reversed).
const allowedTypes = computed(() =>
  RELATIONSHIP_TYPES.filter((t) =>
    rules.value[t][reversed.value ? 'to' : 'from'].includes(props.entityType),
  ),
);

watch(allowedTypes, (allowed) => {
  if (allowed.length > 0 && !allowed.includes(newType.value)) newType.value = allowed[0]!;
}, { immediate: true });

// Candidate targets are entities whose type fits the other side of the edge.
const targetCandidates = computed(() => {
  const otherSide = rules.value[newType.value][reversed.value ? 'from' : 'to'];
  return (entities.value ?? []).filter(
    (e) => e.id !== props.entityId && otherSide.includes(e.type),
  );
});

const targetId = computed(() => {
  const name = targetName.value.trim().toLowerCase();
  return targetCandidates.value.find((e) => e.name.toLowerCase() === name)?.id;
});

async function onAdd() {
  if (!targetId.value) return;
  await createRelationship({
    fromId: reversed.value ? targetId.value : props.entityId,
    toId: reversed.value ? props.entityId : targetId.value,
    type: newType.value,
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
        class="flex items-center gap-2 rounded bg-stone-50 px-2 py-1.5 text-sm"
      >
        <span class="min-w-0 flex-1 truncate">
          <template v-if="rel.fromId === entityId">
            <b>{{ entityName }}</b> <i class="text-amber-800">{{ rel.type }}</i>
            <RouterLink :to="`/entity/${rel.toId}`" class="underline"> {{ nameOf(rel.toId) }}</RouterLink>
          </template>
          <template v-else>
            <RouterLink :to="`/entity/${rel.fromId}`" class="underline">{{ nameOf(rel.fromId) }}</RouterLink>
            <i class="text-amber-800"> {{ rel.type }} </i><b>{{ entityName }}</b>
          </template>
        </span>
        <button
          class="px-1 text-stone-400 hover:text-red-600"
          title="Delete relationship"
          @click="onDelete(rel)"
        >
          ✕
        </button>
      </li>
    </ul>
    <p v-if="!(outgoing?.length || incoming?.length)" class="text-sm text-stone-500">
      No relationships yet.
    </p>

    <p v-if="allowedTypes.length === 0" class="text-sm text-stone-500">
      No relationship kinds apply to this entity type — adjust the rules in Settings.
    </p>
    <form v-else class="flex flex-wrap items-center gap-2" @submit.prevent="onAdd">
      <button
        type="button"
        class="rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
        title="Swap subject and object"
        @click="reversed = !reversed"
      >
        ⇄
      </button>
      <b v-if="!reversed" class="text-sm">{{ entityName }}</b>
      <select
        v-model="newType"
        class="rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
      >
        <option v-for="t in allowedTypes" :key="t" :value="t">{{ t }}</option>
      </select>
      <input
        v-model="targetName"
        list="entity-names"
        placeholder="other entity…"
        class="min-w-0 flex-1 rounded border border-stone-300 bg-white px-2 py-1.5 text-sm"
      />
      <b v-if="reversed" class="text-sm">{{ entityName }}</b>
      <datalist id="entity-names">
        <option v-for="e in targetCandidates" :key="e.id" :value="e.name" />
      </datalist>
      <button
        type="submit"
        class="rounded bg-stone-700 px-3 py-1.5 text-sm text-white disabled:opacity-40"
        :disabled="!targetId"
      >
        Link
      </button>
    </form>
  </div>
</template>
