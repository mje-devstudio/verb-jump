import { describe, expect, it } from 'vitest';
import { NO_CONTROLS } from './input';
import { mergeControls, PAD_DEADZONE_PX, PAD_RADIUS_PX, TouchInput } from './touchInput';

describe('F10 터치 입력', () => {
  it('엄지를 댄 자리가 패드 중심: 데드존 안에서는 서 있고 밖으로 밀면 그쪽으로 간다', () => {
    const t = new TouchInput();
    t.padDown(1, 100);
    expect(t.sample()).toMatchObject({ left: false, right: false });
    t.move(1, 100 + PAD_DEADZONE_PX + 1);
    expect(t.sample()).toMatchObject({ left: false, right: true });
    t.move(1, 100 - PAD_DEADZONE_PX - 1);
    expect(t.sample()).toMatchObject({ left: true, right: false });
  });

  it('멀리 밀면 패드 중심이 따라와서 반대로 바꿀 때 조금만 되돌리면 된다', () => {
    const t = new TouchInput();
    t.padDown(1, 100);
    t.move(1, 300); // 오른쪽 끝까지
    expect(t.padView()?.originX).toBe(300 - PAD_RADIUS_PX);
    t.move(1, 300 - PAD_RADIUS_PX - PAD_DEADZONE_PX - 1);
    expect(t.direction()).toBe(-1);
  });

  it('두 엄지 동시 입력: 왼손으로 달리면서 오른손으로 점프', () => {
    const t = new TouchInput();
    t.padDown(1, 50);
    t.move(1, 80);
    t.jumpDown(2);
    expect(t.sample()).toMatchObject({ right: true, jumpHeld: true, jumpPressed: true });
    // 다음 스텝: 누른 순간 표시는 한 번만, 누르고 있는 것은 유지
    expect(t.sample()).toMatchObject({ right: true, jumpHeld: true, jumpPressed: false });
    t.up(2);
    expect(t.sample()).toMatchObject({ right: true, jumpHeld: false });
    t.up(1);
    expect(t.sample()).toMatchObject({ right: false });
  });

  it('한 스텝 안에 눌렀다 뗀 짧은 탭도 점프로 남는다', () => {
    const t = new TouchInput();
    t.jumpDown(3);
    t.up(3);
    expect(t.sample()).toMatchObject({ jumpPressed: true, jumpHeld: false });
  });

  it('다른 손가락의 이동·떼기는 서로 영향을 주지 않는다', () => {
    const t = new TouchInput();
    t.padDown(1, 50);
    t.verbDown(2);
    t.move(2, 500); // 동사 버튼 손가락이 미끄러져도 패드는 그대로
    expect(t.direction()).toBe(0);
    t.up(1);
    expect(t.sample()).toMatchObject({ verbHeld: true });
  });

  it('동사 버튼이 사라지면 누르던 것을 놓는다', () => {
    const t = new TouchInput();
    t.verbDown(5);
    t.releaseVerb();
    expect(t.sample()).toMatchObject({ verbHeld: false, verbPressed: false });
  });

  it('키보드와 터치를 합친다', () => {
    const m = mergeControls({ ...NO_CONTROLS, left: true }, { ...NO_CONTROLS, jumpPressed: true });
    expect(m).toMatchObject({ left: true, jumpPressed: true, right: false });
  });
});
