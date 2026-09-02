import { nanoid } from 'nanoid';
import { toValue, type MaybeRefOrGetter } from 'vue';
import { db } from '../db';
import type { Entity, EntityType } from '../domain/types';
import { useLiveQuery } from './useLiveQuery';

export function useEntities(typeFilter?: MaybeRefOrGetter<EntityType | 'all'>) {
  const entities = useLiveQuery(
    () => {
      const type = typeFilter ? toValue(typeFilter) : 'all';
      const coll =
        type === 'all' ? db.entities.toCollection() : db.entities.where('type').equals(type);
      return coll.sortBy('name');
    },
    typeFilter ? [() => toValue(typeFilter)] : [],
  );

  return { entities, ...entityActions };
}

export function useEntity(id: MaybeRefOrGetter<string>) {
  const entity = useLiveQuery(() => db.entities.get(toValue(id)), [() => toValue(id)]);
  return { entity, ...entityActions };
}

export async function createEntity(
  input: Pick<Entity, 'type' | 'name'> & { attrs?: Entity['attrs'] },
): Promise<Entity> {
  const now = Date.now();
  const entity: Entity = {
    id: nanoid(),
    type: input.type,
    name: input.name,
    attrs: input.attrs ?? {},
    createdAt: now,
    updatedAt: now,
  };
  await db.entities.add(entity);
  return entity;
}

export async function updateEntity(
  id: string,
  patch: Partial<Pick<Entity, 'name' | 'type' | 'attrs'>>,
): Promise<void> {
  await db.entities.update(id, { ...patch, updatedAt: Date.now() });
}

/** Deleting an entity also deletes its relationships and notes, atomically. */
export async function deleteEntity(id: string): Promise<void> {
  await db.transaction('rw', db.entities, db.relationships, db.notes, async () => {
    await db.relationships.where('fromId').equals(id).delete();
    await db.relationships.where('toId').equals(id).delete();
    await db.notes.where('entityId').equals(id).delete();
    await db.entities.delete(id);
  });
}

const entityActions = { createEntity, updateEntity, deleteEntity };
