import { describe, expect, it, vi } from 'vitest';
import { createGameStore } from './store';

describe('게임 저장소(F09 기반)', () => {
  it('같은 값으로 갱신하면 스냅숏이 같은 객체이고 알리지 않는다', () => {
    const store = createGameStore();
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();
    store.update({ verb: null });
    expect(store.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it('값이 바뀌면 새 스냅숏을 만들고 한 번 알린다', () => {
    const store = createGameStore();
    const listener = vi.fn();
    const off = store.subscribe(listener);
    store.update({ verb: 'climb', meaning: '오르다' });
    expect(store.getSnapshot().verb).toBe('climb');
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    store.update({ verb: 'float' });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
