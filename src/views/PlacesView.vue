<script setup lang="ts">
import { computed } from 'vue';
import { useEntities } from '../composables/useEntities';
import { useAllRelationships } from '../composables/useRelationships';
import { ENTITY_META } from '../domain/entityMeta';
import PlaceTreeNode from '../components/PlaceTreeNode.vue';
import type { PlaceNode } from '../components/placeTree';

// Containment tree derived from located-in edges: fromId located-in toId.
const { entities } = useEntities();
const { relationships } = useAllRelationships();

const tree = computed<PlaceNode[]>(() => {
  const all = entities.value ?? [];
  const rels = (relationships.value ?? []).filter((r) => r.type === 'located-in');
  const byId = new Map(all.map((e) => [e.id, e]));
  const childrenOf = new Map<string, string[]>();
  const hasContainer = new Set<string>();
  for (const r of rels) {
    if (!byId.has(r.fromId) || !byId.has(r.toId)) continue;
    hasContainer.add(r.fromId);
    childrenOf.set(r.toId, [...(childrenOf.get(r.toId) ?? []), r.fromId]);
  }

  const build = (id: string, seen: Set<string>): PlaceNode => ({
    entity: byId.get(id)!,
    children: (childrenOf.get(id) ?? [])
      .filter((cid) => !seen.has(cid)) // guard against located-in cycles
      .map((cid) => build(cid, new Set(seen).add(cid)))
      .sort((a, b) => a.entity.name.localeCompare(b.entity.name)),
  });

  return all
    .filter((e) => e.type === 'location' || childrenOf.has(e.id))
    .filter((e) => !hasContainer.has(e.id))
    .map((e) => build(e.id, new Set([e.id])))
    .sort((a, b) => a.entity.name.localeCompare(b.entity.name));
});
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-3 p-3">
    <h1 class="text-xl font-bold">Places</h1>
    <p class="text-sm opacity-60">
      Containment derived from <i>located-in</i> relationships.
      {{ ENTITY_META.location.icon }} Roots are places not located in anything.
    </p>
    <p v-if="tree.length === 0" class="py-8 text-center opacity-60">
      No locations yet. Create location entities and link them with <i>located-in</i>.
    </p>
    <ul class="card rounded-box bg-base-100 p-2 shadow-sm">
      <PlaceTreeNode v-for="node in tree" :key="node.entity.id" :node="node" />
    </ul>
  </div>
</template>
