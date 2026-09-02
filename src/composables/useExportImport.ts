import { db } from '../db';
import type { Entity, Note, Relationship, Setting } from '../domain/types';
import { isEntityType } from '../domain/types';
import { isRelationshipType } from '../domain/relationshipTypes';

// Export/Import of the whole database as one JSON file — the user's backup.
// Keep this format stable; bump `version` only with a migration path.
// v1: entities, relationships, notes. v2 adds settings (attribute presets);
// v1 files still import (settings just reset to defaults).

export interface WorldExport {
  format: 'worldbuilder';
  version: 1 | 2;
  exportedAt: string;
  entities: Entity[];
  relationships: Relationship[];
  notes: Note[];
  settings?: Setting[];
}

export async function exportWorld(): Promise<WorldExport> {
  return db.transaction('r', db.entities, db.relationships, db.notes, db.settings, async () => ({
    format: 'worldbuilder' as const,
    version: 2 as const,
    exportedAt: new Date().toISOString(),
    entities: await db.entities.toArray(),
    relationships: await db.relationships.toArray(),
    notes: await db.notes.toArray(),
    settings: await db.settings.toArray(),
  }));
}

export function parseWorldExport(json: string): WorldExport {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Not valid JSON.');
  }
  if (typeof data !== 'object' || data === null) throw new Error('Not a Worldbuilder export.');
  const d = data as Record<string, unknown>;
  if (d.format !== 'worldbuilder' || (d.version !== 1 && d.version !== 2))
    throw new Error('Not a Worldbuilder export (unknown format or version).');
  if (!Array.isArray(d.entities) || !Array.isArray(d.relationships) || !Array.isArray(d.notes))
    throw new Error('Export is missing one of: entities, relationships, notes.');

  for (const e of d.entities as Entity[]) {
    if (typeof e.id !== 'string' || typeof e.name !== 'string' || !isEntityType(e.type))
      throw new Error(`Invalid entity record: ${JSON.stringify(e).slice(0, 120)}`);
    if (typeof e.attrs !== 'object' || e.attrs === null) e.attrs = {};
  }
  for (const r of d.relationships as Relationship[]) {
    if (
      typeof r.id !== 'string' ||
      typeof r.fromId !== 'string' ||
      typeof r.toId !== 'string' ||
      !isRelationshipType(r.type)
    )
      throw new Error(`Invalid relationship record: ${JSON.stringify(r).slice(0, 120)}`);
  }
  for (const n of d.notes as Note[]) {
    if (typeof n.id !== 'string' || typeof n.entityId !== 'string' || typeof n.text !== 'string')
      throw new Error(`Invalid note record: ${JSON.stringify(n).slice(0, 120)}`);
  }
  if (d.settings !== undefined) {
    if (!Array.isArray(d.settings)) throw new Error('Export has an invalid settings section.');
    for (const s of d.settings as Setting[]) {
      if (typeof s.key !== 'string')
        throw new Error(`Invalid setting record: ${JSON.stringify(s).slice(0, 120)}`);
    }
  }
  return d as unknown as WorldExport;
}

/** Replaces the whole database with the export's contents, atomically. */
export async function importWorld(data: WorldExport): Promise<void> {
  await db.transaction(
    'rw',
    db.entities,
    db.relationships,
    db.notes,
    db.settings,
    async () => {
      await db.entities.clear();
      await db.relationships.clear();
      await db.notes.clear();
      await db.settings.clear();
      await db.entities.bulkAdd(data.entities);
      await db.relationships.bulkAdd(data.relationships);
      await db.notes.bulkAdd(data.notes);
      if (data.settings?.length) await db.settings.bulkAdd(data.settings);
    },
  );
}
