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
}

/**
 * The connected lineage around a root: the root, all its ancestors, all its
 * descendants, plus each of those entities' parents when known (so siblings'
 * shared parents render correctly). Returned as a flat node list suitable
 * for a DAG layout.
 */
export async function lineageOf(rootId: string): Promise<LineageNode[]> {
  const ids = new Set<string>([rootId]);
  for (const id of await ancestorIdsOf(rootId)) ids.add(id);
  for (const id of await descendantIdsOf(rootId)) ids.add(id);

  const parentMap = new Map<string, string[]>();
  for (const id of ids) parentMap.set(id, await parentIdsOf(id));

  const entities = (await db.entities.bulkGet([...ids])).filter(
    (e): e is Entity => e !== undefined,
  );
  const present = new Set(entities.map((e) => e.id));

  return entities.map((entity) => ({
    entity,
    parentIds: (parentMap.get(entity.id) ?? []).filter((pid) => present.has(pid)),
  }));
}

export function useLineage(rootId: MaybeRefOrGetter<string>) {
  const lineage = useLiveQuery(() => lineageOf(toValue(rootId)), [() => toValue(rootId)]);
  return { lineage };
}
