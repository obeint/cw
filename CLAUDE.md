# Worldbuilder — Lore Mapping PWA

A local-first PWA for fantasy worldbuilding: characters, locations, races,
factions, and the relationships between them (lineage, ranks, rule,
alliances). All data lives on-device in IndexedDB. No backend, no cloud.

## Stack

- Vue 3 (Composition API, `<script setup>`) + Vite
- Dexie.js for IndexedDB
- Cytoscape.js for relationship graphs
- family-chart (or d3-dag) for lineage/genealogy views
- vite-plugin-pwa for installability + offline
- No server. Never add API calls, auth, or remote sync.

## Core design rule (do not violate)

Everything is a **graph**: one `entities` table, one `relationships` table.

- Do NOT create a separate table per entity type (no `characters`,
  `locations`, `races` tables). Type is a field on `entities`.
- Entity attributes are a schemaless `attrs` JSON object. Different types
  carry different keys; that's expected. Never migrate the schema just to
  add an attribute.
- Relationship `type` values come from the controlled list in
  `src/domain/relationshipTypes.ts`. Adding a new relationship kind =
  adding one entry to that list, nothing else.

## Dexie schema

```js
// src/db.js
import Dexie from 'dexie';

export const db = new Dexie('worldbuilder');

db.version(1).stores({
  // Only indexed fields are listed; attrs is stored but not indexed.
  entities: 'id, type, name',
  relationships: 'id, fromId, toId, type, [fromId+type], [toId+type]',
  notes: 'id, entityId, createdAt',
});
```

Record shapes:

```ts
interface Entity {
  id: string;            // nanoid
  type: 'character' | 'location' | 'race' | 'faction' | 'artifact' | 'event';
  name: string;
  attrs: Record<string, unknown>; // rank, titles, birthYear, deathYear, raceId, aliases...
  createdAt: number;
  updatedAt: number;
}

interface Relationship {
  id: string;
  fromId: string;        // subject
  toId: string;          // object
  type: RelationshipType;
  attrs?: Record<string, unknown>; // e.g. { since: 'TA 2941', until: '...' }
}
```

Starter controlled list (`relationshipTypes.ts`):

```
parent-of, spouse-of, sibling-of,
rules, vassal-of, member-of, serves-under,
located-in, capital-of, allied-with, at-war-with, founded
```

Direction convention: `fromId --type--> toId`, read as a sentence
("Aragorn `rules` Gondor"). Family edges are stored one-way
(`parent-of` only); derive child/ancestor/descendant by traversal.

## Derived views (query, don't duplicate)

- **Lineage tree**: recursive traversal of `parent-of` edges from a root
  entity. Use the `[toId+type]` index to find parents, `[fromId+type]`
  for children.
- **Hierarchy/ranks**: `serves-under` / `vassal-of` edges filtered by type.
- **Location map**: `located-in` edges give containment; render as a tree
  or nested graph.
- Never store computed results (e.g. "descendants") in the DB.

## Conventions

- IDs: nanoid strings, generated client-side.
- Deleting an entity must also delete its relationships and notes
  (wrap in a Dexie transaction).
- Every destructive action gets an undo or a confirm.
- Provide Export/Import as a single JSON file (all three tables) —
  this is the user's backup; keep it working at all times.
- Mobile-first layout; graph views must support pinch-zoom and pan.
- Keep components dumb; all DB access through composables in
  `src/composables/` (`useEntities`, `useRelationships`, `useLineage`).

## What NOT to do

- No cloud databases, no Firebase/Supabase, no login.
- No localStorage for app data (IndexedDB only; localStorage is fine for
  UI prefs like theme).
- No per-type tables or rigid columns for attributes.
- Don't add heavy state libraries; Dexie's liveQuery + composables suffice.
