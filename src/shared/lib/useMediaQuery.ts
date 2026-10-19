import { useCallback, useSyncExternalStore } from 'react';

/** CSS 미디어 쿼리 구독(가로·세로, 터치 기기, 움직임 줄이기 등). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );
  const get = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, get, () => false);
}

/** 모바일 가상 조작을 쓸지: 손가락 입력 기기이거나, 데스크톱 확인용으로 주소에 ?touch가 있으면. */
export function useTouchMode(): boolean {
  const coarse = useMediaQuery('(pointer: coarse)');
  return coarse || new URLSearchParams(window.location.search).has('touch');
}
