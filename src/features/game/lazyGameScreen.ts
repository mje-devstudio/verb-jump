import { lazy } from 'react';

/**
 * F19: PixiJS가 든 게임 화면을 첫 화면 번들에서 뗀다. 타이틀이 보이는 동안 미리 받아 두어,
 * 시작 버튼을 누를 때는 대개 이미 받아져 있다.
 */
let loading: Promise<typeof import('./GameScreen')> | null = null;

export function preloadGameScreen() {
  loading ??= import('./GameScreen').catch((e: unknown) => {
    loading = null; // 네트워크 실패면 다음에 다시 받는다
    throw e;
  });
  return loading;
}

export const LazyGameScreen = lazy(() =>
  preloadGameScreen().then((m) => ({ default: m.GameScreen })),
);
