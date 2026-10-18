import { describe, expect, it } from 'vitest';
import commuteRaw from '../../../public/maps/commute.tmj?raw';
import { DEFAULT_TUNING as T } from '../../shared/rules/tuning';
import { COMMUTE_VERBS } from '../data/verbs';
import {
  canReachLetter,
  describePit,
  findPitLandings,
  findUnreachableLetters,
  simulateEdgeJump,
} from './levelCheck';
import { parseTiledMap } from './tiled';
import { Tile, tileAt } from './tilemap';

const level = parseTiledMap(JSON.parse(commuteRaw) as unknown, COMMUTE_VERBS);
const gaps = level.abilityGaps ?? [];
const letters = level.letters ?? [];

describe('F08 1스테이지 맵(commute.tmj) 구성', () => {
  it('시작 위치, 구간마다 체크포인트(구간 1~4), 구간 1~3 고르기 앞 체크포인트가 있다', () => {
    expect(level.checkpoints).toHaveLength(7);
    expect(level.checkpoints[0]).toEqual(level.spawn);
    expect(level.checkpoints.filter((c) => c.resetAbility)).toHaveLength(3);
  });

  it('능력을 잃는 체크포인트 바로 뒤에는 맞는 동사와 오답 적이 함께 있다(고르기)', () => {
    const PAIRS: Record<string, string> = { climb: 'sleep', float: 'dance', break: 'brake' };
    for (const cp of level.checkpoints.filter((c) => c.resetAbility)) {
      const after = level.enemies
        .filter((e) => e.col * 10 > cp.x)
        .sort((a, b) => a.col - b.col)
        .slice(0, 2)
        .map((e) => e.verb);
      const right = after.find((v) => v in PAIRS);
      expect(right).toBeDefined();
      expect(after).toContain(PAIRS[right ?? '']);
    }
  });

  it('철자 코인 다섯 개가 왼쪽부터 B R E A K 순서다', () => {
    const word = [...letters]
      .sort((a, b) => a.x - b.x)
      .map((l) => l.char)
      .join('');
    expect(word).toBe('BREAK');
  });

  it('구간마다 소개용 맞는 동사 적과, 고르기용 맞는 동사·오답 짝이 있다', () => {
    const verbs = level.enemies.map((e) => e.verb);
    for (const [right, wrong] of [
      ['climb', 'sleep'],
      ['float', 'dance'],
      ['break', 'brake'],
    ] as const) {
      expect(verbs.filter((v) => v === right).length).toBeGreaterThanOrEqual(3);
      expect(verbs.filter((v) => v === wrong).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('회사 문이 맵 끝에 있다', () => {
    expect(level.door).toBeDefined();
    expect(level.door?.x ?? 0).toBeGreaterThan((level.map.cols - 10) * 10);
  });

  it('금 간 벽은 천장까지 막혀 있어 점프·climb로 넘을 수 없다', () => {
    const crackedCols = new Set<number>();
    for (let c = 0; c < level.map.cols; c++) {
      if (tileAt(level.map, c, 15) === Tile.Cracked) crackedCols.add(c);
    }
    expect(crackedCols.size).toBeGreaterThan(0);
    for (const c of crackedCols) expect(tileAt(level.map, c, 0)).toBe(Tile.Cracked);
  });
});

describe('F08·F29 레벨 점검 — 하나라도 실패하면 CI 실패', () => {
  it('모든 발판 끝에서 앞뒤로 달려 뛰어도 구멍에 빠지지 않는다(능력용 틈 제외)', () => {
    expect(findPitLandings(level.map, T, gaps).map(describePit)).toEqual([]);
  });

  it('능력용 틈은 float 없이 달려 뛰면 건널 수 없다(의도된 틈인지 확인)', () => {
    for (const [c0] of gaps) {
      const r = simulateEdgeJump(level.map, T, { col: c0 - 1, row: 16, dir: 1 });
      expect(r.landX).toBeNull();
    }
  });

  it('철자 코인은 모두 닿을 수 있다', () => {
    expect(findUnreachableLetters(level.map, T, letters).map((l) => l.char)).toEqual([]);
  });

  it('R은 float 없이는 닿을 수 없다(그 구간의 기술을 써야 닿는 곳)', () => {
    const r = letters.find((l) => l.char === 'R');
    expect(r).toBeDefined();
    if (!r) return;
    expect(canReachLetter(level.map, T, r, { useFloat: true })).toBe(true);
    expect(canReachLetter(level.map, T, r, { useFloat: false })).toBe(false);
  });
});
