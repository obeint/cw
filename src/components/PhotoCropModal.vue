<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  clampView,
  minCoverScale,
  sourceRect,
  zoomAt,
  type CropView,
} from '../utils/cropMath';
import { PORTRAIT_SIZE } from '../utils/image';

// Hand-rolled crop dialog: one finger pans, two fingers pinch, the slider
// (and mouse wheel) zooms. Crop-once: only the cropped 256px JPEG is kept.
const props = defineProps<{ file: File }>();
const emit = defineEmits<{ done: [dataUrl: string]; cancel: [] }>();

const VIEWPORT = 288;

const bitmap = ref<ImageBitmap>();
const objectUrl = ref('');
const error = ref('');
const view = ref<CropView>({ scale: 1, offsetX: 0, offsetY: 0 });
const minScale = ref(1);
const maxScale = computed(() => minScale.value * 6);
const viewportEl = ref<HTMLDivElement>();

function clamp(v: CropView): CropView {
  const b = bitmap.value!;
  return clampView(v, b.width, b.height, VIEWPORT, minScale.value, maxScale.value);
}

onMounted(async () => {
  try {
    bitmap.value = await createImageBitmap(props.file);
    objectUrl.value = URL.createObjectURL(props.file);
    const s = minCoverScale(bitmap.value.width, bitmap.value.height, VIEWPORT);
    minScale.value = s;
    view.value = clamp({
      scale: s,
      offsetX: (VIEWPORT - bitmap.value.width * s) / 2,
      offsetY: (VIEWPORT - bitmap.value.height * s) / 2,
    });
  } catch {
    error.value = 'Could not read that image.';
  }
});

onBeforeUnmount(() => {
  bitmap.value?.close();
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value);
});

// --- Gestures ---
const pointers = new Map<number, { x: number; y: number }>();

function onPointerDown(e: PointerEvent) {
  viewportEl.value?.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
}

function onPointerMove(e: PointerEvent) {
  const prev = pointers.get(e.pointerId);
  if (!prev || !bitmap.value) return;
  const next = { x: e.clientX, y: e.clientY };

  if (pointers.size === 1) {
    view.value = clamp({
      ...view.value,
      offsetX: view.value.offsetX + next.x - prev.x,
      offsetY: view.value.offsetY + next.y - prev.y,
    });
  } else if (pointers.size === 2) {
    const other = [...pointers.entries()].find(([id]) => id !== e.pointerId)![1];
    const oldDist = Math.hypot(prev.x - other.x, prev.y - other.y);
    const newDist = Math.hypot(next.x - other.x, next.y - other.y);
    if (oldDist > 0) {
      const rect = viewportEl.value!.getBoundingClientRect();
      const cx = (next.x + other.x) / 2 - rect.left;
      const cy = (next.y + other.y) / 2 - rect.top;
      const b = bitmap.value;
      view.value = zoomAt(
        view.value,
        view.value.scale * (newDist / oldDist),
        cx,
        cy,
        b.width,
        b.height,
        VIEWPORT,
        minScale.value,
        maxScale.value,
      );
    }
  }
  pointers.set(e.pointerId, next);
}

function onPointerEnd(e: PointerEvent) {
  pointers.delete(e.pointerId);
}

function onWheel(e: WheelEvent) {
  if (!bitmap.value) return;
  const rect = viewportEl.value!.getBoundingClientRect();
  const b = bitmap.value;
  view.value = zoomAt(
    view.value,
    view.value.scale * Math.exp(-e.deltaY / 400),
    e.clientX - rect.left,
    e.clientY - rect.top,
    b.width,
    b.height,
    VIEWPORT,
    minScale.value,
    maxScale.value,
  );
}

// Slider zooms about the viewport center.
const sliderT = computed({
  get: () => {
    const range = maxScale.value - minScale.value;
    return range <= 0 ? 0 : Math.round(((view.value.scale - minScale.value) / range) * 100);
  },
  set: (t: number) => {
    if (!bitmap.value) return;
    const b = bitmap.value;
    view.value = zoomAt(
      view.value,
      minScale.value + (t / 100) * (maxScale.value - minScale.value),
      VIEWPORT / 2,
      VIEWPORT / 2,
      b.width,
      b.height,
      VIEWPORT,
      minScale.value,
      maxScale.value,
    );
  },
});

function confirmCrop() {
  const b = bitmap.value;
  if (!b) return;
  const { sx, sy, size } = sourceRect(view.value, VIEWPORT);
  const target = Math.max(1, Math.min(PORTRAIT_SIZE, Math.round(size)));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = target;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    error.value = 'Canvas 2D is not available in this browser.';
    return;
  }
  ctx.drawImage(b, sx, sy, size, size, 0, 0, target, target);
  emit('done', canvas.toDataURL('image/jpeg', 0.85));
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    role="dialog"
    aria-modal="true"
  >
    <div class="card flex w-fit max-w-[95vw] flex-col gap-3 bg-base-100 p-4 shadow-lg">
      <h3 class="text-base font-semibold">Adjust photo</h3>

      <p v-if="error" class="text-sm text-error">{{ error }}</p>
      <template v-else>
        <div
          ref="viewportEl"
          class="relative touch-none overflow-hidden rounded-box bg-neutral select-none"
          :style="{ width: VIEWPORT + 'px', height: VIEWPORT + 'px' }"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerEnd"
          @pointercancel="onPointerEnd"
          @wheel.prevent="onWheel"
        >
          <img
            v-if="objectUrl && bitmap"
            :src="objectUrl"
            alt=""
            draggable="false"
            class="absolute top-0 left-0 max-w-none"
            :style="{
              width: bitmap.width * view.scale + 'px',
              height: bitmap.height * view.scale + 'px',
              transform: `translate(${view.offsetX}px, ${view.offsetY}px)`,
            }"
          />
          <!-- Circular window: the shadow dims everything outside the circle -->
          <div
            class="pointer-events-none absolute inset-0"
            style="border-radius: 50%; box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.45)"
          ></div>
        </div>
        <input v-model.number="sliderT" type="range" min="0" max="100" class="range range-sm" />
        <p class="text-center text-xs opacity-60">Drag to pan · pinch or slide to zoom</p>
      </template>

      <div class="flex justify-end gap-2">
        <button class="btn btn-ghost btn-sm" @click="emit('cancel')">Cancel</button>
        <button v-if="!error" class="btn btn-primary btn-sm" :disabled="!bitmap" @click="confirmCrop">
          Use photo
        </button>
      </div>
    </div>
  </div>
</template>
