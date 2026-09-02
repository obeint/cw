import { computed } from 'vue';
import { db } from '../db';
import { ENTITY_TYPES, type EntityType } from '../domain/types';
import { RELATIONSHIP_TYPES, type RelationshipType } from '../domain/relationshipTypes';
import {
  DEFAULT_RELATIONSHIP_RULES,
  type RelationshipRule,
} from '../domain/relationshipDefaults';
import { useLiveQuery } from './useLiveQuery';

export const RULES_SETTING_KEY = 'relationshipRules';

type Rules = Record<RelationshipType, RelationshipRule>;

function cleanTypes(value: unknown): EntityType[] | undefined {
  return Array.isArray(value)
    ? value.filter((t): t is EntityType =>
        (ENTITY_TYPES as readonly string[]).includes(t as string),
      )
    : undefined;
}

/** Merge stored (possibly partial) rules over the built-in defaults. */
export function mergeRules(stored: unknown): Rules {
  const value = (stored ?? {}) as Partial<Record<RelationshipType, unknown>>;
  const merged = {} as Rules;
  for (const type of RELATIONSHIP_TYPES) {
    const row = (value[type] ?? {}) as Record<string, unknown>;
    merged[type] = {
      from: cleanTypes(row.from) ?? [...DEFAULT_RELATIONSHIP_RULES[type].from],
      to: cleanTypes(row.to) ?? [...DEFAULT_RELATIONSHIP_RULES[type].to],
    };
  }
  return merged;
}

export function useRelationshipRules() {
  const stored = useLiveQuery(() => db.settings.get(RULES_SETTING_KEY));
  const rules = computed<Rules>(() => mergeRules(stored.value?.value));

  async function save(next: Rules) {
    await db.settings.put({ key: RULES_SETTING_KEY, value: next });
  }

  async function toggle(type: RelationshipType, side: 'from' | 'to', entityType: EntityType) {
    const current = rules.value[type][side];
    const next = current.includes(entityType)
      ? current.filter((t) => t !== entityType)
      : [...current, entityType];
    await save({ ...rules.value, [type]: { ...rules.value[type], [side]: next } });
  }

  async function resetType(type: RelationshipType) {
    await save({
      ...rules.value,
      [type]: {
        from: [...DEFAULT_RELATIONSHIP_RULES[type].from],
        to: [...DEFAULT_RELATIONSHIP_RULES[type].to],
      },
    });
  }

  return { rules, toggle, resetType };
}
