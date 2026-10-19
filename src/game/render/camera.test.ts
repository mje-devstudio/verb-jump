import { describe, expect, it } from 'vitest';
import { cameraX, integerScale, visibleChunks } from './camera';

describe('F03 정수 배율', () => {
  it.each([
    ['데스크톱 1280×720 (HUD 제외 ~650)', 1280, 650, 3],
    ['iPhone 14 가로 844×390 (HUD 겹침)', 844, 390, 2],
    ['iPhone SE 가로 667×375', 667, 375, 2],
    ['iPhone 14 가로인데 HUD가 위를 차지하면 844×350', 844, 350, 1],
    ['아주 작은 창', 200, 100, 1],
  ])('%s → %i배', (_, w, h, k) => {
    expect(integerScale(w, h)).toBe(k);
  });
});

describe('F03 카메라와 화면 밖 타일 생략', () => {
  it('캐릭터를 가운데에 두고, 맵 양 끝에서는 멈춘다', () => {
    expect(cameraX(30, 3700)).toBe(0);
    expect(cameraX(1000, 3700)).toBe(840);
    expect(cameraX(3690, 3700)).toBe(3380);
    expect(cameraX(500, 200)).toBe(0); // 맵이 화면보다 좁으면
  });

  it('픽셀이 흔들리지 않게 정수로 맞춘다', () => {
    expect(Number.isInteger(cameraX(1000.4, 3700))).toBe(true);
  });

  it('카메라에 걸치는 묶음만 그린다(화면 한 폭이면 많아야 두 묶음)', () => {
    expect(visibleChunks(0, 320, 12)).toEqual([0, 0]);
    expect(visibleChunks(100, 320, 12)).toEqual([0, 1]);
    expect(visibleChunks(640, 320, 12)).toEqual([2, 2]);
    expect(visibleChunks(3380, 320, 12)).toEqual([10, 11]);
  });
});
