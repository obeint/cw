import { toValue, type MaybeRefOrGetter } from 'vue';
import { db } from '../db';
import type { Entity } from '../domain/types';
import { useLiveQuery } from './useLiveQuery';

// Lineage is derived by traversing parent-of edges; nothing is stored.
// parent-of direction: fromId = parent, toId = child.

/** Parent ids of an entity, via the [toId+type] index. */
export async function parentIdsOf(id: string): Promise<string[]> {
  const edges = await db.relationships.where('[toId+type]').equals([id, 'parent-of']).toArray();
  return edges.map((e) => e.fromId);
}

/** Child ids of an entity, via the [fromId+type] index. */
export async function childIdsOf(id: string): Promise<string[]> {
  const edges = await db.relationships.where('[fromId+type]').equals([id, 'parent-of']).toArray();
  return edges.map((e) => e.toId);
}

/** Spouse ids of an entity — spouse-of edges in either direction. */
export async function spouseIdsOf(id: string): Promise<string[]> {
  const [out, inc] = await Promise.all([
    db.relationships.where('[fromId+type]').equals([id, 'spouse-of']).toArray(),
    db.relationships.where('[toId+type]').equals([id, 'spouse-of']).toArray(),
  ]);
  return [...new Set([...out.map((e) => e.toId), ...inc.map((e) => e.fromId)])];
}

/** Explicit sibling-of edges in either direction (for when parents aren't recorded). */
export async function explicitSiblingIdsOf(id: string): Promise<string[]> {
  const [out, inc] = await Promise.all([
    db.relationships.where('[fromId+type]').equals([id, 'sibling-of']).toArray(),
    db.relationships.where('[toId+type]').equals([id, 'sibling-of']).toArray(),
  ]);
  return [...new Set([...out.map((e) => e.toId), ...inc.map((e) => e.fromId)])];
}

async function traverse(
  rootId: string,
  next: (id: string) => Promise<string[]>,
): Promise<Set<string>> {
  const seen = new Set<string>();
  let frontier = [rootId];
  while (frontier.length > 0) {
    const batch = (await Promise.all(frontier.map(next))).flat();
    frontier = batch.filter((id) => !seen.has(id));
    for (const id of frontier) seen.add(id);
  }
  seen.delete(rootId); // in case of a cycle back to the root
  return seen;
}

export function ancestorIdsOf(id: string): Promise<Set<string>> {
  return traverse(id, parentIdsOf);
}

export function descendantIdsOf(id: string): Promise<Set<string>> {
  return traverse(id, childIdsOf);
}

export interface LineageNode {
  entity: Entity;
  parentIds: string[]; // restricted to parents inside the lineage set
  spouseIds: string[]; // spouses inside the lineage set
  siblingIds: string[]; // explicit sibling-of partners inside the lineage set
}

/**
 * The connected family around a root: the root, its ancestors and
 * descendants; the spouses of all of those and each spouse's own ancestors
 * (so both families show when known); and the siblings of the root and of
 * every spouse — children of their parents, plus explicit sibling-of edges
 * for when parents aren't recorded. Everything is derived by traversal;
 * nothing is stored. Returned as a flat node list suitable for a DAG layout
 * (marriages carried as spouseIds, explicit sibships as siblingIds).
 */
export async function lineageOf(rootId: string): Promise<LineageNode[]> {
  const base = new Set<string>([rootId]);
  for (const id of await ancestorIdsOf(rootId)) base.add(id);
  for (const id of await descendantIdsOf(rootId)) base.add(id);

  // Spouses of the bloodline, then the spouses' own ancestors (in-laws).
  const ids = new Set(base);
  const spouses = new Set<string>();
  for (const id of base) {
    for (const sid of await spouseIdsOf(id)) {
      if (!ids.has(sid)) spouses.add(sid);
      ids.add(sid);
    }
  }
  for (const sid of spouses) {
    for (const aid of await ancestorIdsOf(sid)) ids.add(aid);
  }

  // Siblings of the root and of each spouse: children of their parents
  // (connected through the shared parent), plus explicit sibling-of edges.
  for (const id of [rootId, ...spouses]) {
    for (const pid of await parentIdsOf(id)) {
      for (const cid of await childIdsOf(pid)) ids.add(cid);
    }
    for (const sib of await explicitSiblingIdsOf(id)) ids.add(sib);
  }

  const parentMap = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();
  const siblingMap = new Map<string, string[]>();
  for (const id of ids) {
    parentMap.set(id, await parentIdsOf(id));
    spouseMap.set(id, await spouseIdsOf(id));
    siblingMap.set(id, await explicitSiblingIdsOf(id));
  }

  const entities = (await db.entities.bulkGet([...ids])).filter(
    (e): e is Entity => e !== undefined,
  );
  const present = new Set(entities.map((e) => e.id));

  return entities.map((entity) => ({
    entity,
    parentIds: (parentMap.get(entity.id) ?? []).filter((pid) => present.has(pid)),
    spouseIds: (spouseMap.get(entity.id) ?? []).filter((sid) => present.has(sid)),
    siblingIds: (siblingMap.get(entity.id) ?? []).filter((sid) => present.has(sid)),
  }));
}

/**
 * Every family in the world at once: all entities touched by a parent-of,
 * spouse-of, or sibling-of edge, as one forest. Disconnected families lay
 * out side by side in the DAG view.
 */
export async function allFamilies(): Promise<LineageNode[]> {
  const familyEdges = await db.relationships
    .where('type')
    .anyOf(['parent-of', 'spouse-of', 'sibling-of'])
    .toArray();

  const ids = new Set<string>();
  for (const e of familyEdges) {
    ids.add(e.fromId);
    ids.add(e.toId);
  }

  const parentMap = new Map<string, string[]>();
  const spouseMap = new Map<string, string[]>();
  const siblingMap = new Map<string, string[]>();
  for (const id of ids) {
    parentMap.set(id, await parentIdsOf(id));
    spouseMap.set(id, await spouseIdsOf(id));
    siblingMap.set(id, await explicitSiblingIdsOf(id));
  }

  const entities = (await db.entities.bulkGet([...ids])).filter(
    (e): e is Entity => e !== undefined,
  );
  const present = new Set(entities.map((e) => e.id));

  return entities.map((entity) => ({
    entity,
    parentIds: (parentMap.get(entity.id) ?? []).filter((pid) => present.has(pid)),
    spouseIds: (spouseMap.get(entity.id) ?? []).filter((sid) => present.has(sid)),
    siblingIds: (siblingMap.get(entity.id) ?? []).filter((sid) => present.has(sid)),
  }));
}

/** Pass the sentinel 'all' as rootId to get every family (allFamilies). */
export function useLineage(rootId: MaybeRefOrGetter<string>) {
  const lineage = useLiveQuery(() => {
    const id = toValue(rootId);
    return id === 'all' ? allFamilies() : lineageOf(id);
  }, [() => toValue(rootId)]);
  return { lineage };
}
