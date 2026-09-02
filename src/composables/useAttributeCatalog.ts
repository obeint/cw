import { computed } from 'vue';
import { db } from '../db';
import { ENTITY_TYPES, type EntityType } from '../domain/types';
import { DEFAULT_ATTRIBUTE_CATALOG, RESERVED_ATTRS } from '../domain/attributeDefaults';
import { useLiveQuery } from './useLiveQuery';

export const CATALOG_SETTING_KEY = 'attributeCatalog';

type Catalog = Record<EntityType, string[]>;

/** Merge a stored (possibly partial) catalog over the built-in defaults. */
export function mergeCatalog(stored: unknown): Catalog {
  const value = (stored ?? {}) as Partial<Record<EntityType, unknown>>;
  const merged = {} as Catalog;
  for (const type of ENTITY_TYPES) {
    const list = value[type];
    merged[type] = Array.isArray(list)
      ? list.filter((n): n is string => typeof n === 'string')
      : [...DEFAULT_ATTRIBUTE_CATALOG[type]];
  }
  return merged;
}

export function useAttributeCatalog() {
  const stored = useLiveQuery(() => db.settings.get(CATALOG_SETTING_KEY));
  const catalog = computed<Catalog>(() => mergeCatalog(stored.value?.value));

  async function save(next: Catalog) {
    await db.settings.put({ key: CATALOG_SETTING_KEY, value: next });
  }

  async function addAttribute(type: EntityType, name: string) {
    const clean = name.trim();
    if (!clean || RESERVED_ATTRS.includes(clean)) return;
    if (catalog.value[type].includes(clean)) return;
    await save({ ...catalog.value, [type]: [...catalog.value[type], clean] });
  }

  async function removeAttribute(type: EntityType, name: string) {
    await save({
      ...catalog.value,
      [type]: catalog.value[type].filter((n) => n !== name),
    });
  }

  async function resetType(type: EntityType) {
    await save({ ...catalog.value, [type]: [...DEFAULT_ATTRIBUTE_CATALOG[type]] });
  }

  return { catalog, addAttribute, removeAttribute, resetType };
}
