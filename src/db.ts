import Dexie, { type Table } from 'dexie';
import type { Entity, Relationship, Note, Setting } from './domain/types';

export class WorldbuilderDB extends Dexie {
  entities!: Table<Entity, string>;
  relationships!: Table<Relationship, string>;
  notes!: Table<Note, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('worldbuilder');
    // Only indexed fields are listed; attrs is stored but not indexed.
    this.version(1).stores({
      entities: 'id, type, name',
      relationships: 'id, fromId, toId, type, [fromId+type], [toId+type]',
      notes: 'id, entityId, createdAt',
    });
    // v2 adds app-level settings (attribute preset catalog). Additive only;
    // existing tables and data are untouched.
    this.version(2).stores({
      settings: 'key',
    });
  }
}

export const db = new WorldbuilderDB();
