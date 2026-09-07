import { describe, expect, it } from 'vitest';
import { buildDisplayNames } from '../src/domain/displayName';
import type { Entity, Relationship } from '../src/domain/types';

function ent(id: string, type: Entity['type'], name: string): Entity {
  return { id, type, name, attrs: {}, createdAt: 0, updatedAt: 0 };
}
function member(fromId: string, toId: string): Relationship {
  return { id: `${fromId}->${toId}`, fromId, toId, type: 'member-of' };
}

describe('buildDisplayNames', () => {
  const aragorn = ent('a', 'character', 'Aragorn');
  const telcontar = ent('t', 'clan', 'Telcontar');
  const rangers = ent('r', 'faction', 'Rangers of the North');

  it('appends the clan name to members', () => {
    const names = buildDisplayNames([aragorn, telcontar], [member('a', 't')]);
    expect(names.get('a')).toBe('Aragorn Telcontar');
    expect(names.get('t')).toBe('Telcontar');
  });

  it('ignores non-clan memberships and non-character members', () => {
    const gondor = ent('g', 'faction', 'Gondor');
    const names = buildDisplayNames(
      [aragorn, rangers, gondor, telcontar],
      [member('a', 'r'), member('g', 't')], // faction member-of clan: no surname
    );
    expect(names.get('a')).toBe('Aragorn');
    expect(names.get('g')).toBe('Gondor');
  });

  it('is deterministic with multiple clans: alphabetically first wins', () => {
    const zeta = ent('z', 'clan', 'Zeta');
    const arn = ent('n', 'clan', 'Arnor');
    // Insertion order deliberately reversed vs. alphabetical
    const names = buildDisplayNames(
      [aragorn, zeta, arn],
      [member('a', 'z'), member('a', 'n')],
    );
    expect(names.get('a')).toBe('Aragorn Arnor');
  });

  it('handles dangling membership edges', () => {
    const names = buildDisplayNames([aragorn], [member('a', 'missing')]);
    expect(names.get('a')).toBe('Aragorn');
  });
});
