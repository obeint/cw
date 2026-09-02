<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import cytoscape, { type Core } from 'cytoscape';
import { useEntities } from '../composables/useEntities';
import { useAllRelationships } from '../composables/useRelationships';
import { RELATIONSHIP_TYPES, type RelationshipType } from '../domain/relationshipTypes';
import { ENTITY_META } from '../domain/entityMeta';

const router = useRouter();
const { entities } = useEntities();
const { relationships } = useAllRelationships();

const container = ref<HTMLDivElement>();
const typeFilter = ref<RelationshipType | 'all'>('all');
let cy: Core | null = null;

function render() {
  if (!cy || !entities.value || !relationships.value) return;
  const rels = relationships.value.filter(
    (r) => typeFilter.value === 'all' || r.type === typeFilter.value,
  );
  const present = new Set(entities.value.map((e) => e.id));
  const elements = [
    ...entities.value.map((e) => ({
      data: { id: e.id, label: e.name, color: ENTITY_META[e.type].color },
    })),
    ...rels
      .filter((r) => present.has(r.fromId) && present.has(r.toId))
      .map((r) => ({ data: { id: r.id, source: r.fromId, target: r.toId, label: r.type } })),
  ];
  cy.elements().remove();
  cy.add(elements);
  cy.layout({ name: 'cose', animate: false, padding: 30 }).run();
}

onMounted(() => {
  cy = cytoscape({
    container: container.value,
    // Pinch-zoom and pan are cytoscape defaults; keep them on.
    userZoomingEnabled: true,
    userPanningEnabled: true,
    style: [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          'background-color': 'data(color)',
          color: '#1c1917',
          'font-size': '10px',
          'text-valign': 'bottom',
          'text-margin-y': 4,
          width: 24,
          height: 24,
        },
      },
      {
        selector: 'edge',
        style: {
          label: 'data(label)',
          'font-size': '7px',
          color: '#78716c',
          'curve-style': 'bezier',
          'target-arrow-shape': 'triangle',
          'line-color': '#d6d3d1',
          'target-arrow-color': '#d6d3d1',
          width: 1.5,
          'text-rotation': 'autorotate',
        },
      },
    ],
  });
  cy.on('tap', 'node', (evt) => router.push(`/entity/${evt.target.id()}`));
  render();
});

watch([entities, relationships, typeFilter], render);
onBeforeUnmount(() => cy?.destroy());
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center gap-2 border-b border-stone-200 bg-white p-2">
      <h1 class="flex-1 font-bold">Relationship graph</h1>
      <select v-model="typeFilter" class="rounded border border-stone-300 bg-white px-2 py-1.5 text-sm">
        <option value="all">All relationships</option>
        <option v-for="t in RELATIONSHIP_TYPES" :key="t" :value="t">{{ t }}</option>
      </select>
    </div>
    <div ref="container" class="min-h-0 flex-1 touch-none"></div>
  </div>
</template>
