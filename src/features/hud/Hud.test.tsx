// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createGameStore, type GameSnapshot } from '../../game/store';
import { Clock, Coins, Lives, Spell } from './Hud';
import { useGameStore } from './useGameStore';

afterEach(cleanup);

const selectCoins = (s: GameSnapshot) => s.coins;

/** 렌더 횟수를 세는 구독 컴포넌트. */
function CoinProbe({
  store,
  onRender,
}: {
  store: ReturnType<typeof createGameStore>;
  onRender: () => void;
}) {
  const coins = useGameStore(store, selectCoins);
  onRender();
  return <span>{coins}</span>;
}

describe('F09 HUD 동기화', () => {
  it('구독한 값이 안 바뀌면 다시 그리지 않는다(시계만 바뀌면 코인은 그대로)', () => {
    const store = createGameStore();
    let renders = 0;
    render(<CoinProbe store={store} onRender={() => renders++} />);
    expect(renders).toBe(1);
    act(() => store.update({ clock: '8:57:01' }));
    act(() => store.update({ clock: '8:57:02', lives: 2 }));
    expect(renders).toBe(1);
    act(() => store.update({ coins: 1 }));
    expect(renders).toBe(2);
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('같은 값으로 갱신하면 아무도 다시 그리지 않는다', () => {
    const store = createGameStore();
    let renders = 0;
    render(<CoinProbe store={store} onRender={() => renders++} />);
    act(() => store.update({ coins: 0, clock: '8:57:00' }));
    expect(renders).toBe(1);
  });

  it('생명·코인·철자·시계를 읽을 수 있는 이름으로 보여 준다', () => {
    const store = createGameStore();
    render(
      <>
        <Lives store={store} />
        <Coins store={store} />
        <Spell store={store} />
        <Clock store={store} />
      </>,
    );
    act(() =>
      store.update({ lives: 4, coins: 12, spell: 'B _ E _ K', clock: '9:00:01', late: true }),
    );
    expect(screen.getByLabelText('생명 4개')).toBeTruthy();
    expect(screen.getByLabelText('코인 12개')).toBeTruthy();
    expect(screen.getByLabelText('철자 B_E_K')).toBeTruthy();
    expect(screen.getByLabelText('지금 9:00:01').textContent).toContain('지각');
  });
});
