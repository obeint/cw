import Dexie, { type Table } from 'dexie';
import type { Entity, Relationship, Note } from './domain/types';

export class WorldbuilderDB extends Dexie {
  entities!: Table<Entity, string>;
  relationships!: Table<Relationship, string>;
  notes!: Table<Note, string>;

  constructor() {
    super('worldbuilder');
    // Only indexed fields are listed; attrs is stored but not indexed.
    this.version(1).stores({
      entities: 'id, type, name',
      relationships: 'id, fromId, toId, type, [fromId+type], [toId+type]',
      notes: 'id, entityId, createdAt',
    });
  }
}

export const db = new WorldbuilderDB();
