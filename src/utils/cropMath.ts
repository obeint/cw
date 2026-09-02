// Pure math for the photo crop view: an image of natural size w×h shown
// inside a square viewport, positioned by scale plus the image's top-left
// offset relative to the viewport's top-left (offsets are <= 0 whenever the
// image covers the viewport).

export interface CropView {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** Smallest scale at which the image still covers the whole viewport. */
export function minCoverScale(w: number, h: number, viewport: number): number {
  return viewport / Math.min(w, h);
}

/** Keep the scale in range and the image covering the viewport. */
export function clampView(
  view: CropView,
  w: number,
  h: number,
  viewport: number,
  minScale: number,
  maxScale: number,
): CropView {
  const scale = Math.min(maxScale, Math.max(minScale, view.scale));
  const minX = viewport - w * scale;
  const minY = viewport - h * scale;
  return {
    scale,
    offsetX: Math.min(0, Math.max(minX, view.offsetX)),
    offsetY: Math.min(0, Math.max(minY, view.offsetY)),
  };
}

/**
 * Zoom towards a fixed point (cx, cy) in viewport coordinates: the image
 * point under it stays put (until clamping intervenes at the edges).
 */
export function zoomAt(
  view: CropView,
  targetScale: number,
  cx: number,
  cy: number,
  w: number,
  h: number,
  viewport: number,
  minScale: number,
  maxScale: number,
): CropView {
  const scale = Math.min(maxScale, Math.max(minScale, targetScale));
  const f = scale / view.scale;
  return clampView(
    {
      scale,
      offsetX: cx - (cx - view.offsetX) * f,
      offsetY: cy - (cy - view.offsetY) * f,
    },
    w,
    h,
    viewport,
    minScale,
    maxScale,
  );
}

/** The square region of the source image currently visible in the viewport. */
export function sourceRect(view: CropView, viewport: number) {
  return {
    sx: -view.offsetX / view.scale,
    sy: -view.offsetY / view.scale,
    size: viewport / view.scale,
  };
}
