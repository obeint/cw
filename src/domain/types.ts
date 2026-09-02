import type { RelationshipType } from './relationshipTypes';

export const ENTITY_TYPES = [
  'character',
  'location',
  'race',
  'faction',
  'artifact',
  'event',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export interface Entity {
  id: string; // nanoid
  type: EntityType;
  name: string;
  attrs: Record<string, unknown>; // rank, titles, birthYear, deathYear, raceId, aliases...
  createdAt: number;
  updatedAt: number;
}

// Direction convention: fromId --type--> toId, read as a sentence
// ("Aragorn rules Gondor"). Family edges are stored one-way (parent-of only).
export interface Relationship {
  id: string;
  fromId: string; // subject
  toId: string; // object
  type: RelationshipType;
  attrs?: Record<string, unknown>; // e.g. { since: 'TA 2941', until: '...' }
}

export interface Note {
  id: string;
  entityId: string;
  text: string;
  createdAt: number;
}

export function isEntityType(value: unknown): value is EntityType {
  return (
    typeof value === 'string' && (ENTITY_TYPES as readonly string[]).includes(value)
  );
}
