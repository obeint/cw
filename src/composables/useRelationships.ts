import { nanoid } from 'nanoid';
import { toValue, type MaybeRefOrGetter } from 'vue';
import { db } from '../db';
import type { Relationship } from '../domain/types';
import type { RelationshipType } from '../domain/relationshipTypes';
import { useLiveQuery } from './useLiveQuery';

/** Outgoing and incoming relationships of one entity, live. */
export function useRelationships(entityId: MaybeRefOrGetter<string>) {
  const outgoing = useLiveQuery(
    () => db.relationships.where('fromId').equals(toValue(entityId)).toArray(),
    [() => toValue(entityId)],
  );
  const incoming = useLiveQuery(
    () => db.relationships.where('toId').equals(toValue(entityId)).toArray(),
    [() => toValue(entityId)],
  );
  return { outgoing, incoming, createRelationship, deleteRelationship };
}

export function useAllRelationships() {
  const relationships = useLiveQuery(() => db.relationships.toArray());
  return { relationships, createRelationship, deleteRelationship };
}

export async function createRelationship(input: {
  fromId: string;
  toId: string;
  type: RelationshipType;
  attrs?: Record<string, unknown>;
}): Promise<Relationship> {
  const rel: Relationship = { id: nanoid(), ...input };
  await db.relationships.add(rel);
  return rel;
}

export async function deleteRelationship(id: string): Promise<void> {
  await db.relationships.delete(id);
}
