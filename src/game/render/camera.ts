import { VIEW_H, VIEW_W } from '../../shared/rules/tuning';

/** 화면 밖 타일 생략(F03) 단위: 타일 32칸(320px = 화면 한 폭)씩 묶어 하나의 그래픽으로 그린다. */
export const CHUNK_COLS = 32;

/**
 * 카메라 x(F03): 캐릭터를 화면 가운데에 두되 맵 밖은 보여 주지 않는다. 픽셀이 흔들리지 않게 정수로.
 * 맵이 화면보다 좁으면 0.
 */
export function cameraX(centerX: number, mapWidthPx: number, viewW = VIEW_W): number {
  const max = Math.max(0, mapWidthPx - viewW);
  return Math.round(Math.min(max, Math.max(0, centerX - viewW / 2)));
}

/** 카메라에 걸치는 묶음 번호 범위 [first, last]. 이 밖의 묶음은 그리지 않는다. */
export function visibleChunks(
  camX: number,
  chunkPx: number,
  chunkCount: number,
  viewW = VIEW_W,
): [number, number] {
  const first = Math.max(0, Math.floor(camX / chunkPx));
  const last = Math.min(chunkCount - 1, Math.floor((camX + viewW - 1) / chunkPx));
  return [first, last];
}

/** 창 크기에 맞는 가장 큰 정수 배율(nearest 확대 + 레터박스). 화면보다 작아도 1배는 유지한다. */
export function integerScale(w: number, h: number): number {
  return Math.max(1, Math.floor(Math.min(w / VIEW_W, h / VIEW_H)));
}
