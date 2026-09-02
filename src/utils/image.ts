// Entity portraits live in the schemaless attrs object as a downscaled
// data-URL string — no schema change, and JSON export/import keeps working.
export const PORTRAIT_ATTR = 'portrait';
export const PORTRAIT_SIZE = 256;

export function portraitOf(attrs: Record<string, unknown> | undefined): string | undefined {
  const v = attrs?.[PORTRAIT_ATTR];
  return typeof v === 'string' && v.startsWith('data:image/') ? v : undefined;
}

/** Center-crop to a square, downscale, and encode as a JPEG data URL. */
export async function fileToPortraitDataUrl(
  file: File,
  size = PORTRAIT_SIZE,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const target = Math.min(size, side); // never upscale
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = target;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available in this browser.');
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    bitmap.close();
  }
}
