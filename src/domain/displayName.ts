import type { Entity, Relationship } from './types';

// Clan last names are derived, never stored: a character who is member-of a
// clan displays as "<name> <clan name>". Renaming the clan renames every
// member at once. With multiple clan memberships the alphabetically first
// clan name wins, so the result is deterministic.
export function buildDisplayNames(
  entities: Entity[],
  relationships: Relationship[],
): Map<string, string> {
  const byId = new Map(entities.map((e) => [e.id, e]));
  const clanOf = new Map<string, string>(); // member id -> clan name

  for (const r of relationships) {
    if (r.type !== 'member-of') continue;
    const member = byId.get(r.fromId);
    const clan = byId.get(r.toId);
    if (member?.type !== 'character' || clan?.type !== 'clan') continue;
    const current = clanOf.get(member.id);
    if (current === undefined || clan.name.localeCompare(current) < 0)
      clanOf.set(member.id, clan.name);
  }

  const names = new Map<string, string>();
  for (const e of entities) {
    const clanName = clanOf.get(e.id);
    names.set(e.id, clanName ? `${e.name} ${clanName}` : e.name);
  }
  return names;
}
