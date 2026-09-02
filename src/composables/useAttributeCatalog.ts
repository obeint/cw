import { computed } from 'vue';
import { db } from '../db';
import { ENTITY_TYPES, type EntityType } from '../domain/types';
import { DEFAULT_ATTRIBUTE_CATALOG, RESERVED_ATTRS } from '../domain/attributeDefaults';
import { useLiveQuery } from './useLiveQuery';

export const CATALOG_SETTING_KEY = 'attributeCatalog';

/** A preset attribute name, optionally with suggested values to tap instead of typing. */
export interface AttributePreset {
  name: string;
  values?: string[];
}

type Catalog = Record<EntityType, AttributePreset[]>;

function normalizePresets(list: unknown): AttributePreset[] | undefined {
  if (!Array.isArray(list)) return undefined;
  const out: AttributePreset[] = [];
  for (const item of list) {
    // Older catalogs stored plain name strings; both shapes stay valid.
    if (typeof item === 'string') out.push({ name: item });
    else if (item && typeof item === 'object' && typeof (item as AttributePreset).name === 'string') {
      const values = (item as AttributePreset).values;
      out.push({
        name: (item as AttributePreset).name,
        values: Array.isArray(values)
          ? values.filter((v): v is string => typeof v === 'string')
          : undefined,
      });
    }
  }
  return out;
}

/** Merge a stored (possibly partial) catalog over the built-in defaults. */
export function mergeCatalog(stored: unknown): Catalog {
  const value = (stored ?? {}) as Partial<Record<EntityType, unknown>>;
  const merged = {} as Catalog;
  for (const type of ENTITY_TYPES) {
    merged[type] =
      normalizePresets(value[type]) ??
      DEFAULT_ATTRIBUTE_CATALOG[type].map((name) => ({ name }));
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
    if (catalog.value[type].some((p) => p.name === clean)) return;
    await save({ ...catalog.value, [type]: [...catalog.value[type], { name: clean }] });
  }

  async function removeAttribute(type: EntityType, name: string) {
    await save({
      ...catalog.value,
      [type]: catalog.value[type].filter((p) => p.name !== name),
    });
  }

  async function resetType(type: EntityType) {
    await save({
      ...catalog.value,
      [type]: DEFAULT_ATTRIBUTE_CATALOG[type].map((name) => ({ name })),
    });
  }

  async function addValue(type: EntityType, presetName: string, value: string) {
    const clean = value.trim();
    if (!clean) return;
    await save({
      ...catalog.value,
      [type]: catalog.value[type].map((p) =>
        p.name === presetName && !(p.values ?? []).includes(clean)
          ? { ...p, values: [...(p.values ?? []), clean] }
          : p,
      ),
    });
  }

  async function removeValue(type: EntityType, presetName: string, value: string) {
    await save({
      ...catalog.value,
      [type]: catalog.value[type].map((p) =>
        p.name === presetName
          ? { ...p, values: (p.values ?? []).filter((v) => v !== value) }
          : p,
      ),
    });
  }

  return { catalog, addAttribute, removeAttribute, resetType, addValue, removeValue };
}
