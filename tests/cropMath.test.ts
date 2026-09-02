import { describe, expect, it } from 'vitest';
import { clampView, minCoverScale, sourceRect, zoomAt } from '../src/utils/cropMath';

// A 400×300 landscape image in a 288px square viewport.
const W = 400;
const H = 300;
const V = 288;
const MIN = minCoverScale(W, H, V); // 288/300 = 0.96
const MAX = MIN * 6;

const clamp = (v: Parameters<typeof clampView>[0]) => clampView(v, W, H, V, MIN, MAX);

describe('crop math', () => {
  it('minCoverScale makes the short side fill the viewport', () => {
    expect(MIN * H).toBeCloseTo(V);
    expect(minCoverScale(100, 900, 288)).toBeCloseTo(2.88);
  });

  it('clampView keeps the image covering the viewport', () => {
    // Way off to the bottom-right: pulled back so no gap shows
    const v = clamp({ scale: MIN, offsetX: 50, offsetY: 50 });
    expect(v.offsetX).toBe(0);
    expect(v.offsetY).toBe(0);
    // Way off to the top-left
    const v2 = clamp({ scale: MIN, offsetX: -9999, offsetY: -9999 });
    expect(v2.offsetX).toBeCloseTo(V - W * MIN);
    expect(v2.offsetY).toBeCloseTo(V - H * MIN);
    // Scale out of range is clamped
    expect(clamp({ scale: 0.01, offsetX: 0, offsetY: 0 }).scale).toBe(MIN);
    expect(clamp({ scale: 999, offsetX: 0, offsetY: 0 }).scale).toBe(MAX);
  });

  it('zoomAt keeps the point under the cursor fixed', () => {
    const start = clamp({ scale: MIN * 2, offsetX: -100, offsetY: -80 });
    const cx = 150;
    const cy = 100;
    // Image-space point under the cursor before zooming
    const before = { x: (cx - start.offsetX) / start.scale, y: (cy - start.offsetY) / start.scale };
    const zoomed = zoomAt(start, start.scale * 1.5, cx, cy, W, H, V, MIN, MAX);
    const after = { x: (cx - zoomed.offsetX) / zoomed.scale, y: (cy - zoomed.offsetY) / zoomed.scale };
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('sourceRect maps the viewport back to image pixels', () => {
    const v = clamp({ scale: MIN * 2, offsetX: -120, offsetY: -60 });
    const { sx, sy, size } = sourceRect(v, V);
    expect(sx).toBeCloseTo(120 / v.scale);
    expect(sy).toBeCloseTo(60 / v.scale);
    expect(size).toBeCloseTo(V / v.scale);
    // The visible region always fits inside the image
    expect(sx).toBeGreaterThanOrEqual(0);
    expect(sy).toBeGreaterThanOrEqual(0);
    expect(sx + size).toBeLessThanOrEqual(W + 1e-9);
    expect(sy + size).toBeLessThanOrEqual(H + 1e-9);
  });
});
