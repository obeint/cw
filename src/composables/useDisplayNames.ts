import { computed } from 'vue';
import { db } from '../db';
import { buildDisplayNames } from '../domain/displayName';
import { useLiveQuery } from './useLiveQuery';

/** Live map of entity id -> display name (clan last names appended). */
export function useDisplayNames() {
  const entities = useLiveQuery(() => db.entities.toArray());
  const memberships = useLiveQuery(() =>
    db.relationships.where('type').equals('member-of').toArray(),
  );
  const displayNames = computed(() =>
    buildDisplayNames(entities.value ?? [], memberships.value ?? []),
  );

  function displayNameOf(id: string): string {
    return displayNames.value.get(id) ?? '(deleted)';
  }

  return { displayNames, displayNameOf };
}
