// Controlled list of relationship types. Adding a new relationship kind =
// adding one entry here, nothing else (see CLAUDE.md).
export const RELATIONSHIP_TYPES = [
  'parent-of',
  'spouse-of',
  'sibling-of',
  'rules',
  'vassal-of',
  'member-of',
  'serves-under',
  'located-in',
  'capital-of',
  'allied-with',
  'at-war-with',
  'founded',
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export function isRelationshipType(value: unknown): value is RelationshipType {
  return (
    typeof value === 'string' &&
    (RELATIONSHIP_TYPES as readonly string[]).includes(value)
  );
}
