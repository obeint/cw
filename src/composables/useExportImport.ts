import { db } from '../db';
import type { Entity, Note, Relationship } from '../domain/types';
import { isEntityType } from '../domain/types';
import { isRelationshipType } from '../domain/relationshipTypes';

// Export/Import of all three tables as one JSON file — the user's backup.
// Keep this format stable; bump `version` only with a migration path.

export interface WorldExport {
  format: 'worldbuilder';
  version: 1;
  exportedAt: string;
  entities: Entity[];
  relationships: Relationship[];
  notes: Note[];
}

export async function exportWorld(): Promise<WorldExport> {
  return db.transaction('r', db.entities, db.relationships, db.notes, async () => ({
    format: 'worldbuilder' as const,
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    entities: await db.entities.toArray(),
    relationships: await db.relationships.toArray(),
    notes: await db.notes.toArray(),
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
  if (d.format !== 'worldbuilder' || d.version !== 1)
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
  return d as unknown as WorldExport;
}

/** Replaces the whole database with the export's contents, atomically. */
export async function importWorld(data: WorldExport): Promise<void> {
  await db.transaction('rw', db.entities, db.relationships, db.notes, async () => {
    await db.entities.clear();
    await db.relationships.clear();
    await db.notes.clear();
    await db.entities.bulkAdd(data.entities);
    await db.relationships.bulkAdd(data.relationships);
    await db.notes.bulkAdd(data.notes);
  });
}
