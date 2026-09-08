import type { EntityType } from './types';
import { PORTRAIT_ATTR } from '../utils/image';

// Built-in attribute presets per entity type. These are suggestions only —
// attrs stays schemaless and any key can still be typed freely. Users can
// customize the list per type in Settings; customizations are stored in the
// settings table and included in the JSON backup.
export const DEFAULT_ATTRIBUTE_CATALOG: Record<EntityType, string[]> = {
  character: ['rank', 'titles', 'birthYear', 'deathYear', 'aliases', 'gender'],
  location: ['region', 'terrain', 'population', 'foundedYear'],
  race: ['lifespan', 'homeland', 'language', 'traits'],
  faction: ['motto', 'foundedYear', 'colors', 'goal'],
  artifact: ['material', 'powers', 'creator', 'forgedYear'],
  event: ['year', 'date', 'outcome'],
  story: ['year', 'date', 'status', 'chapter'],
  clan: ['motto', 'seat', 'foundedYear', 'sigil'],
};

// Attribute holding a story's scene text; edited in its own big textarea on
// the entity page, so keep it out of the key/value editor and presets.
export const STORY_TEXT_ATTR = 'text';

// Keys managed by dedicated UI, never offered or accepted as presets.
export const RESERVED_ATTRS = [PORTRAIT_ATTR];
