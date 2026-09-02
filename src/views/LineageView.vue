<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { graphStratify, sugiyama } from 'd3-dag';
import { useEntities } from '../composables/useEntities';
import { useLineage, type LineageNode } from '../composables/useLineage';
import { ENTITY_META } from '../domain/entityMeta';

const props = defineProps<{ id?: string }>();

const { entities } = useEntities('character');
const rootId = ref(props.id ?? '');
watchEffect(() => {
  if (props.id) rootId.value = props.id;
  else if (!rootId.value && entities.value?.length) rootId.value = entities.value[0]!.id;
});

const lineageResult = useLineage(rootId);
const lineage = computed(() => (rootId.value ? lineageResult.lineage.value : undefined));

const NODE_W = 130;
const NODE_H = 48;

interface LaidOutNode {
  x: number;
  y: number;
  node: LineageNode;
}

const layout = computed(() => {
  const nodes = lineage.value;
  if (!nodes || nodes.length === 0) return null;
  try {
    const graph = graphStratify()(
      nodes.map((n) => ({ id: n.entity.id, parentIds: n.parentIds, node: n })),
    );
    const { width, height } = sugiyama().nodeSize([NODE_W + 20, NODE_H + 40])(graph);
    const placed: LaidOutNode[] = [];
    for (const gn of graph.nodes()) {
      placed.push({ x: gn.x, y: gn.y, node: gn.data.node });
    }
    const links = [...graph.links()].map((l) => ({
      id: `${l.source.data.id}->${l.target.data.id}`,
      points: l.points,
    }));
    return { width, height, placed, links };
  } catch (err) {
    console.error('lineage layout failed:', err);
    return null; // e.g. a parent-of cycle; show the fallback message
  }
});
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex items-center gap-2 border-b border-stone-200 bg-white p-2">
      <h1 class="flex-1 font-bold">Lineage</h1>
      <select v-model="rootId" class="max-w-48 rounded border border-stone-300 bg-white px-2 py-1.5 text-sm">
        <option value="" disabled>Pick a character…</option>
        <option v-for="e in entities ?? []" :key="e.id" :value="e.id">{{ e.name }}</option>
      </select>
    </div>

    <div class="min-h-0 flex-1 overflow-auto p-4">
      <p v-if="!rootId" class="py-8 text-center text-stone-500">
        Pick a character to see their family tree.
      </p>
      <p v-else-if="lineage && lineage.length <= 1" class="py-8 text-center text-stone-500">
        No parent-of relationships around this character yet. Add some from the entity page.
      </p>
      <p v-else-if="lineage && !layout" class="py-8 text-center text-red-700">
        Could not lay out this lineage — check for a parent-of cycle.
      </p>
      <svg
        v-else-if="layout"
        :width="layout.width + NODE_W"
        :height="layout.height + NODE_H"
        :viewBox="`${-NODE_W / 2} ${-NODE_H / 2} ${layout.width + NODE_W} ${layout.height + NODE_H}`"
      >
        <path
          v-for="link in layout.links"
          :key="link.id"
          :d="'M' + link.points.map((p) => `${p[0]},${p[1]}`).join(' L')"
          fill="none"
          stroke="#a8a29e"
          stroke-width="1.5"
        />
        <g v-for="p in layout.placed" :key="p.node.entity.id">
          <rect
            :x="p.x - NODE_W / 2"
            :y="p.y - NODE_H / 2"
            :width="NODE_W"
            :height="NODE_H"
            rx="8"
            :fill="p.node.entity.id === rootId ? '#fef3c7' : 'white'"
            :stroke="ENTITY_META[p.node.entity.type].color"
            stroke-width="1.5"
          />
          <text :x="p.x" :y="p.y - 2" text-anchor="middle" class="text-[11px] font-semibold">
            {{ p.node.entity.name }}
          </text>
          <text :x="p.x" :y="p.y + 14" text-anchor="middle" class="fill-stone-400 text-[9px]">
            {{ [p.node.entity.attrs.birthYear, p.node.entity.attrs.deathYear].filter(Boolean).join(' – ') }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>
