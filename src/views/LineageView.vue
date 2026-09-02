<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { graphStratify, sugiyama, type GraphNode } from 'd3-dag';
import { useEntities } from '../composables/useEntities';
import { useLineage, type LineageNode } from '../composables/useLineage';
import { ENTITY_META } from '../domain/entityMeta';
import type { Entity } from '../domain/types';

const props = defineProps<{ id?: string }>();
const router = useRouter();

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
const SLOT_W = NODE_W + 20; // one card incl. horizontal gap
const SLOT_H = NODE_H + 40;

interface Card {
  x: number;
  y: number;
  entity: Entity;
  isSpouse: boolean;
}

interface Datum {
  id: string;
  parentIds: string[];
  node: LineageNode;
}

const layout = computed(() => {
  const nodes = lineage.value;
  if (!nodes || nodes.length === 0) return null;
  try {
    const graph = graphStratify()(
      nodes.map((n): Datum => ({ id: n.entity.id, parentIds: n.parentIds, node: n })),
    );
    // Couples need wider slots: one extra card width per attached spouse.
    const { width, height } = sugiyama().nodeSize((gn: GraphNode<Datum>) => [
      (1 + gn.data.node.externalSpouses.length) * SLOT_W,
      SLOT_H,
    ])(graph);

    const cards: Card[] = [];
    const marriages: { x1: number; x2: number; y: number }[] = [];
    const primaryPos = new Map<string, { x: number; y: number }>();

    for (const gn of graph.nodes()) {
      const n = gn.data.node;
      const k = n.externalSpouses.length;
      // Spread the couple's cards symmetrically around the slot center so
      // parent/child edges (which attach at the center) hang between them.
      const cardX = (i: number) => gn.x + (i - k / 2) * SLOT_W;
      cards.push({ x: cardX(0), y: gn.y, entity: n.entity, isSpouse: false });
      primaryPos.set(n.entity.id, { x: cardX(0), y: gn.y });
      n.externalSpouses.forEach((spouse, idx) => {
        cards.push({ x: cardX(idx + 1), y: gn.y, entity: spouse, isSpouse: true });
        marriages.push({
          x1: cardX(idx) + NODE_W / 2,
          x2: cardX(idx + 1) - NODE_W / 2,
          y: gn.y,
        });
      });
    }

    // Dashed connector between spouses who are both lineage nodes.
    const inSetMarriages: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const seen = new Set<string>();
    for (const n of nodes) {
      for (const sid of n.spouseIdsInSet) {
        const key = [n.entity.id, sid].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        const a = primaryPos.get(n.entity.id);
        const b = primaryPos.get(sid);
        if (a && b) inSetMarriages.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      }
    }

    const links = [...graph.links()].map((l) => ({
      id: `${l.source.data.id}->${l.target.data.id}`,
      points: l.points,
    }));
    return { width, height, cards, marriages, inSetMarriages, links };
  } catch (err) {
    console.error('lineage layout failed:', err);
    return null; // e.g. a parent-of cycle; show the fallback message
  }
});

function lifespan(e: Entity): string {
  return [e.attrs.birthYear, e.attrs.deathYear].filter(Boolean).join(' – ');
}
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
      <p
        v-else-if="lineage && lineage.length <= 1 && !lineage[0]?.externalSpouses.length"
        class="py-8 text-center text-stone-500"
      >
        No parent-of or spouse-of relationships around this character yet. Add some from the
        entity page.
      </p>
      <p v-else-if="lineage && !layout" class="py-8 text-center text-red-700">
        Could not lay out this lineage — check for a parent-of cycle.
      </p>
      <svg
        v-else-if="layout"
        :width="layout.width + 2 * NODE_W"
        :height="layout.height + NODE_H"
        :viewBox="`${-NODE_W} ${-NODE_H / 2} ${layout.width + 2 * NODE_W} ${layout.height + NODE_H}`"
      >
        <path
          v-for="link in layout.links"
          :key="link.id"
          :d="'M' + link.points.map((p) => `${p[0]},${p[1]}`).join(' L')"
          fill="none"
          stroke="#a8a29e"
          stroke-width="1.5"
        />
        <line
          v-for="(m, i) in layout.inSetMarriages"
          :key="'im' + i"
          :x1="m.x1"
          :y1="m.y1"
          :x2="m.x2"
          :y2="m.y2"
          stroke="#d6a15e"
          stroke-width="1.5"
          stroke-dasharray="5 4"
        />
        <g v-for="(m, i) in layout.marriages" :key="'m' + i">
          <line
            :x1="m.x1"
            :y1="m.y"
            :x2="m.x2"
            :y2="m.y"
            stroke="#d6a15e"
            stroke-width="1.5"
          />
          <text
            :x="(m.x1 + m.x2) / 2"
            :y="m.y - 4"
            text-anchor="middle"
            class="fill-amber-700 text-[10px]"
          >
            ⚭
          </text>
        </g>
        <g
          v-for="card in layout.cards"
          :key="card.entity.id + (card.isSpouse ? ':s' : '')"
          class="cursor-pointer"
          @click="router.push(`/entity/${card.entity.id}`)"
        >
          <rect
            :x="card.x - NODE_W / 2"
            :y="card.y - NODE_H / 2"
            :width="NODE_W"
            :height="NODE_H"
            rx="8"
            :fill="card.entity.id === rootId ? '#fef3c7' : 'white'"
            :stroke="ENTITY_META[card.entity.type].color"
            stroke-width="1.5"
            :stroke-dasharray="card.isSpouse ? '4 3' : undefined"
          />
          <text :x="card.x" :y="card.y - 2" text-anchor="middle" class="text-[11px] font-semibold">
            {{ card.entity.name }}
          </text>
          <text :x="card.x" :y="card.y + 14" text-anchor="middle" class="fill-stone-400 text-[9px]">
            {{ lifespan(card.entity) }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>
