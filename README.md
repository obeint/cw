# Worldbuilder

A local-first PWA for fantasy worldbuilding: characters, locations, races,
factions, and the relationships between them. All data lives on-device in
IndexedDB — no backend, no cloud. See `CLAUDE.md` for the full design spec.

## Develop

```sh
npm install
npm run dev        # dev server
npm test           # vitest (fake-indexeddb)
npm run build      # typecheck (vue-tsc) + production build with PWA assets
npm run preview    # serve the production build
```

## Layout

- `src/db.ts` — Dexie schema: `entities`, `relationships`, `notes`
- `src/domain/` — entity/relationship types, the controlled relationship list
- `src/composables/` — all DB access (`useEntities`, `useRelationships`,
  `useLineage`, `useNotes`, export/import)
- `src/views/` — Entities, Entity detail, Graph (Cytoscape), Lineage (d3-dag),
  Places (located-in tree), Backup (JSON export/import)
