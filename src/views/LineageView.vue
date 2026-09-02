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
const SLOT_W = NODE_W + 24;
const SLOT_H = NODE_H + 44;

// Couples are joined through invisible "union" junction nodes: the union is
// a child of both partners, and their children hang from the union — so
// each parent-child line runs from between the couple, and both families'
// branches lay out side by side.
interface Datum {
  id: string;
  parentIds: string[];
  person?: LineageNode;
  married?: boolean; // union nodes only
}

const layout = computed(() => {
  const nodes = lineage.value;
  if (!nodes || nodes.length === 0) return null;
  try {
    const unionKey = (a: string, b: string) => 'u:' + [a, b].sort().join('|');
    const unions = new Map<string, { a: string; b: string; married: boolean }>();

    // Unions for married couples...
    for (const n of nodes) {
      for (const sid of n.spouseIds) {
        const key = unionKey(n.entity.id, sid);
        if (!unions.has(key)) unions.set(key, { a: n.entity.id, b: sid, married: true });
      }
    }
    // ...and for unmarried co-parents, so children still hang between them.
    for (const n of nodes) {
      if (n.parentIds.length === 2) {
        const key = unionKey(n.parentIds[0]!, n.parentIds[1]!);
        if (!unions.has(key))
          unions.set(key, { a: n.parentIds[0]!, b: n.parentIds[1]!, married: false });
      }
    }

    const data: Datum[] = nodes.map((n) => {
      const viaUnion =
        n.parentIds.length === 2 ? unionKey(n.parentIds[0]!, n.parentIds[1]!) : undefined;
      return {
        id: n.entity.id,
        parentIds: viaUnion ? [viaUnion] : n.parentIds,
        person: n,
      };
    });
    for (const [key, u] of unions)
      data.push({ id: key, parentIds: [u.a, u.b], married: u.married });

    const graph = graphStratify()(data);
    const { width, height } = sugiyama().nodeSize((gn: GraphNode<Datum>) =>
      gn.data.person ? [SLOT_W, SLOT_H] : [24, 24],
    )(graph);

    const cards: { x: number; y: number; node: LineageNode }[] = [];
    const junctions: { x: number; y: number; married: boolean }[] = [];
    const pos = new Map<string, { x: number; y: number }>();
    for (const gn of graph.nodes()) {
      if (gn.data.person) {
        cards.push({ x: gn.x, y: gn.y, node: gn.data.person });
        pos.set(gn.data.id, { x: gn.x, y: gn.y });
      } else junctions.push({ x: gn.x, y: gn.y, married: gn.data.married ?? false });
    }

    // Dashed connector for explicit sibling-of pairs that share no drawn
    // parent — without it the sibling card would look unrelated.
    const siblingLinks: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const seenPairs = new Set<string>();
    for (const n of nodes) {
      for (const sid of n.siblingIds) {
        const key = [n.entity.id, sid].sort().join('|');
        if (seenPairs.has(key)) continue;
        seenPairs.add(key);
        const sib = nodes.find((m) => m.entity.id === sid);
        if (!sib || n.parentIds.some((p) => sib.parentIds.includes(p))) continue;
        const a = pos.get(n.entity.id);
        const b = pos.get(sid);
        if (a && b) siblingLinks.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      }
    }

    const links = [...graph.links()].map((l) => ({
      id: `${l.source.data.id}->${l.target.data.id}`,
      points: l.points,
    }));
    return { width, height, cards, junctions, links, siblingLinks };
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
      <p v-else-if="lineage && lineage.length <= 1" class="py-8 text-center text-stone-500">
        No parent-of or spouse-of relationships around this character yet. Add some from the
        entity page.
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
        <line
          v-for="(s, i) in layout.siblingLinks"
          :key="'sib' + i"
          :x1="s.x1"
          :y1="s.y1"
          :x2="s.x2"
          :y2="s.y2"
          stroke="#a8a29e"
          stroke-width="1.5"
          stroke-dasharray="5 4"
        />
        <g v-for="(j, i) in layout.junctions" :key="'j' + i">
          <circle :cx="j.x" :cy="j.y" r="3" fill="#a8a29e" />
          <text
            v-if="j.married"
            :x="j.x + 6"
            :y="j.y + 4"
            class="fill-amber-700 text-[11px]"
          >
            ⚭
          </text>
        </g>
        <g
          v-for="card in layout.cards"
          :key="card.node.entity.id"
          class="cursor-pointer"
          @click="router.push(`/entity/${card.node.entity.id}`)"
        >
          <rect
            :x="card.x - NODE_W / 2"
            :y="card.y - NODE_H / 2"
            :width="NODE_W"
            :height="NODE_H"
            rx="8"
            :fill="card.node.entity.id === rootId ? '#fef3c7' : 'white'"
            :stroke="ENTITY_META[card.node.entity.type].color"
            stroke-width="1.5"
          />
          <text :x="card.x" :y="card.y - 2" text-anchor="middle" class="text-[11px] font-semibold">
            {{ card.node.entity.name }}
          </text>
          <text :x="card.x" :y="card.y + 14" text-anchor="middle" class="fill-stone-400 text-[9px]">
            {{ lifespan(card.node.entity) }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>
