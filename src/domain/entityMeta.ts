import type { EntityType } from './types';

// Presentation-only metadata per entity type (shared by list, graph, lineage).
export const ENTITY_META: Record<EntityType, { label: string; icon: string; color: string }> = {
  character: { label: 'Character', icon: '🧝', color: '#b45309' },
  location: { label: 'Location', icon: '🏰', color: '#15803d' },
  race: { label: 'Race', icon: '🧬', color: '#7e22ce' },
  faction: { label: 'Faction', icon: '⚔️', color: '#b91c1c' },
  artifact: { label: 'Artifact', icon: '💍', color: '#a16207' },
  event: { label: 'Event', icon: '🔥', color: '#0369a1' },
};
