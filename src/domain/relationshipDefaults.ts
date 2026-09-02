import type { EntityType } from './types';
import type { RelationshipType } from './relationshipTypes';

export interface RelationshipRule {
  from: EntityType[]; // allowed subject types
  to: EntityType[]; // allowed object types
}

// Which entity types each relationship can connect (fromId --type--> toId).
// UI-level applicability only: the stored graph model is unchanged, and
// existing edges are always displayed regardless of these rules. Users can
// customize per type in Settings; customizations live in the settings table
// and ride along in the JSON backup.
// Display-only inverse phrasings: picking "offspring-of" in the UI stores
// the canonical parent-of edge with subject and object swapped — the stored
// model stays one-way per CLAUDE.md. Symmetric types (spouse-of, sibling-of,
// allied-with, at-war-with) read the same both ways and have no entry.
export const INVERSE_LABELS: Partial<Record<RelationshipType, string>> = {
  'parent-of': 'offspring-of',
  rules: 'ruled-by',
  'vassal-of': 'liege-of',
  'member-of': 'has-member',
  'serves-under': 'commands',
  'located-in': 'contains',
  'capital-of': 'has-capital',
  founded: 'founded-by',
  'involved-in': 'involves',
};

export const DEFAULT_RELATIONSHIP_RULES: Record<RelationshipType, RelationshipRule> = {
  'parent-of': { from: ['character'], to: ['character'] },
  'spouse-of': { from: ['character'], to: ['character'] },
  'sibling-of': { from: ['character'], to: ['character'] },
  rules: { from: ['character', 'faction'], to: ['location', 'faction'] },
  'vassal-of': {
    from: ['character', 'faction', 'location'],
    to: ['character', 'faction', 'location'],
  },
  'member-of': { from: ['character'], to: ['faction', 'race'] },
  'serves-under': { from: ['character'], to: ['character'] },
  'located-in': {
    from: ['location', 'character', 'faction', 'artifact', 'event'],
    to: ['location'],
  },
  'capital-of': { from: ['location'], to: ['location', 'faction'] },
  'allied-with': { from: ['character', 'faction'], to: ['character', 'faction'] },
  'at-war-with': { from: ['character', 'faction'], to: ['character', 'faction'] },
  founded: { from: ['character', 'faction'], to: ['location', 'faction'] },
  'involved-in': {
    from: ['character', 'faction', 'location', 'race', 'artifact'],
    to: ['event'],
  },
};
