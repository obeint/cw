import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db';
import { createEntity, deleteEntity } from '../src/composables/useEntities';
import { createRelationship } from '../src/composables/useRelationships';
import {
  ancestorIdsOf,
  descendantIdsOf,
  lineageOf,
  parentIdsOf,
  childIdsOf,
} from '../src/composables/useLineage';
import { exportWorld, importWorld, parseWorldExport } from '../src/composables/useExportImport';
import { mergeCatalog, CATALOG_SETTING_KEY } from '../src/composables/useAttributeCatalog';
import { DEFAULT_ATTRIBUTE_CATALOG } from '../src/domain/attributeDefaults';
import { mergeRules } from '../src/composables/useRelationshipRules';
import { DEFAULT_RELATIONSHIP_RULES } from '../src/domain/relationshipDefaults';
import { nanoid } from 'nanoid';

beforeEach(async () => {
  await db.entities.clear();
  await db.relationships.clear();
  await db.notes.clear();
  await db.settings.clear();
});

describe('deleteEntity cascade', () => {
  it('deletes the entity with its relationships and notes', async () => {
    const aragorn = await createEntity({ type: 'character', name: 'Aragorn' });
    const gondor = await createEntity({ type: 'location', name: 'Gondor' });
    await createRelationship({ fromId: aragorn.id, toId: gondor.id, type: 'rules' });
    await createRelationship({ fromId: gondor.id, toId: aragorn.id, type: 'founded' });
    await db.notes.add({ id: nanoid(), entityId: aragorn.id, text: 'Heir of Isildur', createdAt: 1 });

    await deleteEntity(aragorn.id);

    expect(await db.entities.get(aragorn.id)).toBeUndefined();
    expect(await db.entities.get(gondor.id)).toBeDefined();
    expect(await db.relationships.count()).toBe(0);
    expect(await db.notes.count()).toBe(0);
  });
});

describe('lineage traversal', () => {
  async function family() {
    // grandparent -> parentA -> child; parentB -> child (two parents)
    const gp = await createEntity({ type: 'character', name: 'Grandparent' });
    const pa = await createEntity({ type: 'character', name: 'Parent A' });
    const pb = await createEntity({ type: 'character', name: 'Parent B' });
    const child = await createEntity({ type: 'character', name: 'Child' });
    await createRelationship({ fromId: gp.id, toId: pa.id, type: 'parent-of' });
    await createRelationship({ fromId: pa.id, toId: child.id, type: 'parent-of' });
    await createRelationship({ fromId: pb.id, toId: child.id, type: 'parent-of' });
    return { gp, pa, pb, child };
  }

  it('finds parents and children one level away', async () => {
    const { pa, pb, child } = await family();
    expect((await parentIdsOf(child.id)).sort()).toEqual([pa.id, pb.id].sort());
    expect(await childIdsOf(pa.id)).toEqual([child.id]);
  });

  it('finds ancestors and descendants recursively', async () => {
    const { gp, pa, pb, child } = await family();
    expect([...(await ancestorIdsOf(child.id))].sort()).toEqual([gp.id, pa.id, pb.id].sort());
    expect([...(await descendantIdsOf(gp.id))].sort()).toEqual([pa.id, child.id].sort());
  });

  it('builds a lineage set around a mid-tree root', async () => {
    const { pa } = await family();
    const nodes = await lineageOf(pa.id);
    expect(nodes.map((n) => n.entity.name).sort()).toEqual(['Child', 'Grandparent', 'Parent A']);
    const child = nodes.find((n) => n.entity.name === 'Child')!;
    // Parent B is outside the lineage set, so the child's in-set parents are just Parent A
    expect(child.parentIds).toEqual([pa.id]);
  });

  it('survives a parent-of cycle without hanging', async () => {
    const a = await createEntity({ type: 'character', name: 'A' });
    const b = await createEntity({ type: 'character', name: 'B' });
    await createRelationship({ fromId: a.id, toId: b.id, type: 'parent-of' });
    await createRelationship({ fromId: b.id, toId: a.id, type: 'parent-of' });
    const ancestors = await ancestorIdsOf(a.id);
    expect(ancestors.has(b.id)).toBe(true);
  });
});

describe('export / import', () => {
  it('round-trips all three tables', async () => {
    const a = await createEntity({ type: 'character', name: 'Aragorn', attrs: { rank: 'King' } });
    const g = await createEntity({ type: 'location', name: 'Gondor' });
    await createRelationship({ fromId: a.id, toId: g.id, type: 'rules', attrs: { since: 'TA 3019' } });
    await db.notes.add({ id: nanoid(), entityId: a.id, text: 'note', createdAt: 1 });

    const exported = await exportWorld();
    const parsed = parseWorldExport(JSON.stringify(exported));

    await db.entities.clear();
    await db.relationships.clear();
    await db.notes.clear();
    await importWorld(parsed);

    expect(await db.entities.count()).toBe(2);
    expect(await db.relationships.count()).toBe(1);
    expect(await db.notes.count()).toBe(1);
    expect((await db.entities.get(a.id))?.attrs).toEqual({ rank: 'King' });
  });

  it('round-trips the settings table (attribute presets)', async () => {
    const custom = { ...DEFAULT_ATTRIBUTE_CATALOG, character: ['rank', 'houseWords'] };
    await db.settings.put({ key: CATALOG_SETTING_KEY, value: custom });

    const exported = await exportWorld();
    expect(exported.version).toBe(2);

    await db.settings.clear();
    await importWorld(parseWorldExport(JSON.stringify(exported)));

    const restored = await db.settings.get(CATALOG_SETTING_KEY);
    expect(mergeCatalog(restored?.value).character).toEqual(['rank', 'houseWords']);
  });

  it('accepts a version-1 backup without settings', async () => {
    const v1 = {
      format: 'worldbuilder',
      version: 1,
      exportedAt: new Date().toISOString(),
      entities: [
        { id: 'e1', type: 'character', name: 'Aragorn', attrs: {}, createdAt: 1, updatedAt: 1 },
      ],
      relationships: [],
      notes: [],
    };
    await importWorld(parseWorldExport(JSON.stringify(v1)));
    expect(await db.entities.count()).toBe(1);
    // No stored catalog -> defaults apply
    expect(mergeCatalog(undefined)).toEqual(DEFAULT_ATTRIBUTE_CATALOG);
  });

  it('relationship rules: defaults are sensible and merges are safe', () => {
    // Family edges apply to characters only by default
    expect(DEFAULT_RELATIONSHIP_RULES['parent-of'].from).toEqual(['character']);
    expect(DEFAULT_RELATIONSHIP_RULES['parent-of'].to).toEqual(['character']);
    // Anything can be located in a location, but only locations contain
    expect(DEFAULT_RELATIONSHIP_RULES['located-in'].to).toEqual(['location']);

    // No stored override -> defaults
    expect(mergeRules(undefined)).toEqual(DEFAULT_RELATIONSHIP_RULES);
    // Partial override merges over defaults; junk entries are dropped
    const merged = mergeRules({ 'parent-of': { from: ['race', 'bogus'], to: ['race'] } });
    expect(merged['parent-of']).toEqual({ from: ['race'], to: ['race'] });
    expect(merged['spouse-of']).toEqual(DEFAULT_RELATIONSHIP_RULES['spouse-of']);
  });

  it('rejects invalid payloads', () => {
    expect(() => parseWorldExport('not json')).toThrow('Not valid JSON');
    expect(() => parseWorldExport('{}')).toThrow('unknown format');
    expect(() =>
      parseWorldExport(
        JSON.stringify({
          format: 'worldbuilder',
          version: 1,
          entities: [{ id: 'x', type: 'dragon', name: 'Bad' }],
          relationships: [],
          notes: [],
        }),
      ),
    ).toThrow('Invalid entity');
  });
});
