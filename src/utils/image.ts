// Entity portraits live in the schemaless attrs object as a downscaled
// data-URL string — no schema change, and JSON export/import keeps working.
export const PORTRAIT_ATTR = 'portrait';
export const PORTRAIT_SIZE = 256;

export function portraitOf(attrs: Record<string, unknown> | undefined): string | undefined {
  const v = attrs?.[PORTRAIT_ATTR];
  return typeof v === 'string' && v.startsWith('data:image/') ? v : undefined;
}
