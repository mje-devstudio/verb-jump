import { describe, expect, it } from 'vitest';
import { judgeContact } from './stomp';

const enemy = { x: 100, y: 100, w: 12, h: 12 };
const P = { w: 10, h: 14 };
/** 발 높이(feetY)와 x로 주인공 상자를 만든다. */
const at = (x: number, feetY: number) => ({ x, y: feetY - P.h, ...P });

describe('F06 밟기 판정', () => {
  it('적 윗면 4px 아래까지는 밟기다', () => {
    expect(judgeContact(at(101, 104), 104, 100, enemy, 4)).toBe('stomp');
    expect(judgeContact(at(101, 102), 100, 100, enemy, 4)).toBe('stomp');
  });

  it('그보다 아래에서 닿으면 피격이다', () => {
    expect(judgeContact(at(101, 105), 105, 100, enemy, 4)).toBe('hurt');
    expect(judgeContact(at(91, 112), 112, 0, enemy, 4)).toBe('hurt'); // 옆에서
  });

  it('올라가는 중에는 밟을 수 없다(아래에서 부딪히면 피격)', () => {
    expect(judgeContact(at(101, 103), 103, -50, enemy, 4)).toBe('hurt');
  });

  it('한 스텝에 깊이 떨어져도 직전 발 위치가 윗면 위였으면 밟기다', () => {
    expect(judgeContact(at(101, 106), 99, 320, enemy, 4)).toBe('stomp');
  });

  it('닿지 않으면 none', () => {
    expect(judgeContact(at(60, 112), 112, 0, enemy, 4)).toBe('none');
  });

  it('모바일은 밟기 판정 폭이 20% 넓다(옆 피격 판정은 그대로)', () => {
    // 적 오른쪽 끝(112)에서 1px 떨어진 곳: 기본은 닿지 않고, 모바일(+1.2px씩)은 밟기
    const near = at(113, 102);
    expect(judgeContact(near, 99, 100, enemy, 4)).toBe('none');
    expect(judgeContact(near, 99, 100, enemy, 4, 1.2)).toBe('stomp');
  });
});
