import { shallowRef, watch, onScopeDispose, type Ref, type WatchSource } from 'vue';
import { liveQuery, type Subscription } from 'dexie';

/**
 * Bridge a Dexie liveQuery into a Vue ref. The querier re-runs whenever the
 * tables it touches change; pass `deps` for reactive inputs the querier
 * closes over (Dexie can't see Vue reactivity).
 */
export function useLiveQuery<T>(
  querier: () => T | Promise<T>,
  deps: WatchSource[] = [],
): Ref<T | undefined> {
  const value = shallowRef<T>();
  let sub: Subscription | null = null;

  const start = () => {
    sub?.unsubscribe();
    sub = liveQuery(querier).subscribe({
      next: (v) => {
        value.value = v;
      },
      error: (err) => {
        console.error('liveQuery error:', err);
      },
    });
  };

  start();
  if (deps.length > 0) watch(deps, start);
  onScopeDispose(() => sub?.unsubscribe());

  return value;
}
